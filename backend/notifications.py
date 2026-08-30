"""FixitZ notifications — order updates via SendGrid email + Bulk Blaster SMS.

All senders are best-effort: any failure is logged and swallowed so the order
flow is never blocked. Channels self-disable when their env vars are missing.
"""
import os
import logging
import urllib.parse
import urllib.request

logger = logging.getLogger("fixitz.notify")

STATUS_COPY = {
    "pending": ("Order received", "We've received your order and it's being reviewed."),
    "confirmed": ("Order confirmed", "Good news! Your order has been confirmed."),
    "in-progress": ("Order in progress", "Your order is now being worked on."),
    "completed": ("Order completed", "Your order is complete. Thank you for choosing FixitZ!"),
    "cancelled": ("Order cancelled", "Your order has been cancelled. Contact us if this was a mistake."),
}


def _sender_email():
    return os.environ.get("SENDER_EMAIL", "").strip()


def send_email(to: str, subject: str, html: str) -> bool:
    api_key = os.environ.get("SENDGRID_API_KEY", "").strip()
    sender = _sender_email()
    if not api_key or not sender or not to:
        logger.info("Email skipped (missing key/sender/recipient)")
        return False
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail
        msg = Mail(from_email=sender, to_emails=to, subject=subject, html_content=html)
        resp = SendGridAPIClient(api_key).send(msg)
        ok = resp.status_code in (200, 201, 202)
        if not ok:
            logger.warning("SendGrid returned %s", resp.status_code)
        return ok
    except Exception as e:
        logger.error("SendGrid send failed: %s", e)
        return False


def send_sms(phone: str, text: str) -> bool:
    """Bulk Blaster SMS via configurable HTTP GET gateway.

    Env:
      BULKBLASTER_API_URL  base endpoint, e.g. https://api.bulkblaster.in/api/sms
      BULKBLASTER_API_KEY  api key
      BULKBLASTER_SENDER_ID  6-char DLT sender id
      BULKBLASTER_ROUTE      optional route (default: transactional)
      BULKBLASTER_TEMPLATE_ID optional DLT template id
    """
    base = os.environ.get("BULKBLASTER_API_URL", "").strip()
    api_key = os.environ.get("BULKBLASTER_API_KEY", "").strip()
    sender = os.environ.get("BULKBLASTER_SENDER_ID", "").strip()
    if not base or not api_key or not phone:
        logger.info("SMS skipped (missing url/key/phone)")
        return False
    num = "".join(ch for ch in str(phone) if ch.isdigit())
    if len(num) == 10:
        num = "91" + num
    params = {
        "apikey": api_key,
        "senderid": sender,
        "number": num,
        "message": text,
        "route": os.environ.get("BULKBLASTER_ROUTE", "transactional"),
    }
    tid = os.environ.get("BULKBLASTER_TEMPLATE_ID", "").strip()
    if tid:
        params["templateid"] = tid
    try:
        url = base + ("&" if "?" in base else "?") + urllib.parse.urlencode(params)
        with urllib.request.urlopen(url, timeout=10) as r:
            body = r.read().decode("utf-8", "ignore")
            logger.info("BulkBlaster response: %s", body[:200])
            return r.status == 200
    except Exception as e:
        logger.error("BulkBlaster send failed: %s", e)
        return False


def _order_label(order: dict) -> str:
    items = order.get("items") or []
    names = ", ".join(i.get("name", "") for i in items if i.get("name"))
    return names or (order.get("type", "order").capitalize() + " order")


def notify_order(order: dict, status: str):
    """Send email + SMS to the customer for the given order status."""
    title, line = STATUS_COPY.get(status, ("Order update", f"Your order status is now: {status}."))
    label = _order_label(order)
    amount = order.get("amount", 0)
    short_id = str(order.get("id", ""))[:8].upper()
    email = order.get("userEmail")
    phone = order.get("userPhone")
    name = order.get("userName") or "there"

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
      <div style="background:#FF6A00;padding:20px;border-radius:16px 16px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">FixitZ</h1>
        <p style="color:#fff;margin:4px 0 0;font-size:12px">30-Min Doorstep Repair · Jammu</p>
      </div>
      <div style="border:1px solid #eee;border-top:none;padding:20px;border-radius:0 0 16px 16px">
        <h2 style="color:#1a1a1a;font-size:18px">{title}</h2>
        <p style="color:#444">Hi {name}, {line}</p>
        <table style="width:100%;font-size:14px;color:#333;margin-top:12px">
          <tr><td style="padding:4px 0;color:#888">Order</td><td style="text-align:right">#{short_id}</td></tr>
          <tr><td style="padding:4px 0;color:#888">Items</td><td style="text-align:right">{label}</td></tr>
          <tr><td style="padding:4px 0;color:#888">Amount</td><td style="text-align:right">₹{amount}</td></tr>
          <tr><td style="padding:4px 0;color:#888">Status</td><td style="text-align:right;color:#FF6A00;font-weight:bold">{status.upper()}</td></tr>
        </table>
        <p style="color:#888;font-size:12px;margin-top:16px">Need help? Call us — FixitZ Jammu.</p>
      </div>
    </div>"""
    sms = f"FixitZ: {title}. Order #{short_id} ({label}) - Rs.{amount}. Status: {status}."

    if email:
        send_email(email, f"FixitZ — {title} (#{short_id})", html)
    if phone:
        send_sms(phone, sms)


def notify_customer_new_order(order: dict):
    """Instant confirmation to the customer right after placing an order."""
    short_id = str(order.get("id", ""))[:8].upper()
    email = order.get("userEmail")
    phone = order.get("userPhone")
    name = order.get("userName") or "there"
    label = _order_label(order)
    amount = order.get("amount", 0)
    if email:
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
          <div style="background:#FF6A00;padding:20px;border-radius:16px 16px 0 0">
            <h1 style="color:#fff;margin:0;font-size:22px">FixitZ</h1>
            <p style="color:#fff;margin:4px 0 0;font-size:12px">30-Min Doorstep Repair · Jammu</p>
          </div>
          <div style="border:1px solid #eee;border-top:none;padding:20px;border-radius:0 0 16px 16px">
            <h2 style="color:#1a1a1a;font-size:18px">Order #{short_id} confirmed</h2>
            <p style="color:#444">Hi {name}, we've received your order. We'll contact you soon.</p>
            <table style="width:100%;font-size:14px;color:#333;margin-top:12px">
              <tr><td style="padding:4px 0;color:#888">Items</td><td style="text-align:right">{label}</td></tr>
              <tr><td style="padding:4px 0;color:#888">Amount</td><td style="text-align:right">₹{amount}</td></tr>
            </table>
          </div>
        </div>"""
        send_email(email, f"FixitZ — Order #{short_id} confirmed", html)
    if phone:
        send_sms(phone, f"Order #{short_id} confirmed. We'll contact you soon.")


def notify_admin_new_order(order: dict, admin_email: str = "", admin_phone: str = ""):
    """Instant alert to the store admin when a new order arrives."""
    short_id = str(order.get("id", ""))[:8].upper()
    name = order.get("userName") or "Customer"
    phone = order.get("userPhone") or "-"
    label = _order_label(order)
    amount = order.get("amount", 0)
    if admin_email:
        html = f"""
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
          <div style="background:#111;padding:18px;border-radius:14px 14px 0 0">
            <h1 style="color:#FF6A00;margin:0;font-size:20px">FixitZ · New Order</h1>
          </div>
          <div style="border:1px solid #eee;border-top:none;padding:18px;border-radius:0 0 14px 14px">
            <p style="color:#444;font-size:15px">New order received from <b>{name}</b>, {phone}. Check dashboard.</p>
            <table style="width:100%;font-size:14px;color:#333;margin-top:8px">
              <tr><td style="padding:3px 0;color:#888">Order</td><td style="text-align:right">#{short_id}</td></tr>
              <tr><td style="padding:3px 0;color:#888">Items</td><td style="text-align:right">{label}</td></tr>
              <tr><td style="padding:3px 0;color:#888">Amount</td><td style="text-align:right">₹{amount}</td></tr>
            </table>
          </div>
        </div>"""
        send_email(admin_email, f"New Order #{short_id}", html)
    if admin_phone:
        send_sms(admin_phone, f"New Order #{short_id} from {name} ({phone})")
