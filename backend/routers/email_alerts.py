"""
Email Alerts Router - Send email notifications to users
Uses Gmail SMTP with App Password for authentication
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from datetime import datetime

router = APIRouter()

# ============== CONFIGURATION ==============
# Get credentials from environment variables
GMAIL_USER = os.getenv("GMAIL_USER", "")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD", "")

# ============== MODELS ==============

class AlertData(BaseModel):
    type: str  # warning, success, info, danger
    title: str
    message: str
    actionLink: Optional[str] = None

class SendEmailRequest(BaseModel):
    email: EmailStr
    alert: AlertData
    userName: Optional[str] = None

class TestEmailRequest(BaseModel):
    email: EmailStr

class EmailPreferences(BaseModel):
    enabled: bool
    types: List[str]
    frequency: str  # instant, daily, weekly

# ============== EMAIL TEMPLATES ==============

def get_email_template(alert: AlertData, user_name: str = "") -> tuple[str, str]:
    """Generate HTML email based on alert type"""
    
    colors = {
        "warning": {"bg": "#fef3c7", "border": "#f59e0b", "header_bg": "linear-gradient(135deg, #f59e0b, #d97706)", "text": "#92400e", "emoji": "⚠️"},
        "success": {"bg": "#d1fae5", "border": "#10b981", "header_bg": "linear-gradient(135deg, #10b981, #059669)", "text": "#065f46", "emoji": "🎉"},
        "danger": {"bg": "#fee2e2", "border": "#ef4444", "header_bg": "linear-gradient(135deg, #ef4444, #dc2626)", "text": "#991b1b", "emoji": "🚨"},
        "info": {"bg": "#fef3c7", "border": "#8b5a2b", "header_bg": "linear-gradient(135deg, #8b5a2b, #a0522d)", "text": "#78350f", "emoji": "💡"},
    }
    
    style = colors.get(alert.type, colors["info"])
    greeting = f"Hi {user_name}," if user_name else "Hi there,"
    
    titles = {
        "warning": "Financial Alert",
        "success": "Great News!",
        "danger": "Urgent Alert",
        "info": "Financial Insight",
    }
    
    header_title = titles.get(alert.type, "WealthWise Alert")
    
    # Subject
    subject = f"{style['emoji']} WealthWise: {alert.title}"
    
    # HTML Body
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: {style['header_bg']}; padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">{style['emoji']} {header_title}</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
                <p style="color: #374151; font-size: 16px;">{greeting}</p>
                
                <!-- Alert Box -->
                <div style="background: {style['bg']}; border-left: 4px solid {style['border']}; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <div style="font-size: 18px; font-weight: bold; color: {style['text']}; margin-bottom: 10px;">
                        {alert.title}
                    </div>
                    <div style="color: {style['text']}; line-height: 1.6;">
                        {alert.message}
                    </div>
                </div>
                
                <p style="color: #6b7280;">Stay on top of your finances with WealthWise!</p>
                
                <!-- CTA Button -->
                <a href="https://wealthwise-af0e4.web.app{alert.actionLink or '/dashboard'}" 
                   style="display: inline-block; background: {style['border']}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 10px;">
                    Open App →
                </a>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                <p style="margin: 0;">You're receiving this because you enabled email alerts in WealthWise.</p>
                <p style="margin: 5px 0 0 0;">© {datetime.now().year} WealthWise - Your AI Financial Advisor</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return subject, html


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send email using Gmail SMTP"""
    
    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        raise HTTPException(
            status_code=500, 
            detail="Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables."
        )
    
    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"WealthWise <{GMAIL_USER}>"
        msg["To"] = to_email
        
        # Attach HTML
        html_part = MIMEText(html_body, "html")
        msg.attach(html_part)
        
        # Connect to Gmail SMTP
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())
        
        return True
        
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=401,
            detail="Gmail authentication failed. Check your App Password."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")


# ============== ENDPOINTS ==============

@router.post("/send")
async def send_alert_email(request: SendEmailRequest):
    """Send an alert email to the user"""
    
    subject, html = get_email_template(request.alert, request.userName or "")
    
    success = send_email(request.email, subject, html)
    
    return {
        "success": success,
        "message": f"Email sent to {request.email}",
        "subject": subject
    }


@router.post("/test")
async def send_test_email(request: TestEmailRequest):
    """Send a test email to verify configuration"""
    
    test_alert = AlertData(
        type="success",
        title="Email Setup Successful! ✅",
        message="Congratulations! Your WealthWise email notifications are working correctly. You'll receive alerts about spending, goals, and investments.",
        actionLink="/alerts"
    )
    
    subject, html = get_email_template(test_alert, "")
    
    success = send_email(request.email, subject, html)
    
    return {
        "success": success,
        "message": f"Test email sent to {request.email}"
    }


@router.get("/health")
async def email_health_check():
    """Check if email service is configured"""
    
    configured = bool(GMAIL_USER and GMAIL_APP_PASSWORD)
    
    return {
        "configured": configured,
        "gmail_user": GMAIL_USER[:3] + "***" if GMAIL_USER else None,
        "status": "ready" if configured else "not_configured",
        "message": "Email service ready" if configured else "Set GMAIL_USER and GMAIL_APP_PASSWORD in .env"
    }
