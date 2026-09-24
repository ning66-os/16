import smtplib
import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Dict, Any, Optional
from pathlib import Path
from ..config import settings
from datetime import datetime


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_use_tls = settings.SMTP_USE_TLS
        self.from_email = settings.FROM_EMAIL
        self.app_url = settings.APP_URL

    async def send_report_email(self,
                                 to_emails: List[str],
                                 subject: str,
                                 case_info: Dict[str, Any],
                                 report_content: str,
                                 include_3d_link: bool = True,
                                 attachments: Optional[List[str]] = None) -> Dict[str, Any]:
        if not self.smtp_host:
            return {
                "success": False,
                "message": "SMTP configuration not found",
                "recipients": to_emails
            }

        msg = MIMEMultipart("alternative")
        msg["From"] = self.from_email
        msg["To"] = ", ".join(to_emails)
        msg["Subject"] = subject

        html_content = self._build_html_email(case_info, report_content, include_3d_link)
        
        text_part = MIMEText(report_content, "plain", "utf-8")
        html_part = MIMEText(html_content, "html", "utf-8")
        
        msg.attach(text_part)
        msg.attach(html_part)

        if attachments:
            for filepath in attachments:
                if Path(filepath).exists():
                    with open(filepath, "rb") as f:
                        part = MIMEBase("application", "octet-stream")
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename={Path(filepath).name}"
                    )
                    msg.attach(part)

        try:
            if self.smtp_use_tls:
                await aiosmtplib.send(
                    msg,
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    username=self.smtp_username,
                    password=self.smtp_password,
                    use_tls=True
                )
            else:
                await aiosmtplib.send(
                    msg,
                    hostname=self.smtp_host,
                    port=self.smtp_port,
                    username=self.smtp_username,
                    password=self.smtp_password
                )
            
            return {
                "success": True,
                "message": "Email sent successfully",
                "recipients": to_emails,
                "sent_at": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to send email: {str(e)}",
                "recipients": to_emails
            }

    def _build_html_email(self, 
                          case_info: Dict[str, Any],
                          report_content: str,
                          include_3d_link: bool) -> str:
        import markdown
        
        html_report = markdown.markdown(report_content)
        
        case_number = case_info.get("case_number", "N/A")
        title = case_info.get("title", "火灾事故复盘报告")
        fire_date = case_info.get("fire_date", "N/A")
        location = case_info.get("location", "N/A")
        
        view_3d_url = f"{self.app_url}/cases/{case_info.get('id')}/3d" if include_3d_link and case_info.get("id") else None
        
        html = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header {{
            border-bottom: 3px solid #dc2626;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }}
        .header h1 {{
            color: #dc2626;
            margin: 0 0 10px 0;
            font-size: 24px;
        }}
        .case-info {{
            background: #fef2f2;
            border-left: 4px solid #dc2626;
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 0 4px 4px 0;
        }}
        .case-info p {{
            margin: 5px 0;
        }}
        .case-info strong {{
            color: #991b1b;
        }}
        .content {{
            font-size: 14px;
        }}
        .content h2 {{
            color: #dc2626;
            border-bottom: 2px solid #fee2e2;
            padding-bottom: 8px;
            margin-top: 30px;
        }}
        .content h3 {{
            color: #b91c1c;
            margin-top: 20px;
        }}
        .content ul, .content ol {{
            padding-left: 25px;
        }}
        .content li {{
            margin: 8px 0;
        }}
        .content code {{
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
        }}
        .btn-3d {{
            display: inline-block;
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: white !important;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
        }}
        .btn-3d:hover {{
            background: linear-gradient(135deg, #b91c1c, #991b1b);
        }}
        .footer {{
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
            text-align: center;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
        }}
        th, td {{
            border: 1px solid #e5e7eb;
            padding: 10px;
            text-align: left;
        }}
        th {{
            background: #fef2f2;
            color: #991b1b;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔥 火灾事故复盘报告</h1>
            <p style="color: #6b7280; margin: 0;">{datetime.now().strftime('%Y年%m月%d日 %H:%M')}</p>
        </div>

        <div class="case-info">
            <p><strong>案件编号:</strong> {case_number}</p>
            <p><strong>案件名称:</strong> {title}</p>
            <p><strong>发生地点:</strong> {location}</p>
            <p><strong>发生时间:</strong> {fire_date}</p>
        </div>

        {f'<a href="{view_3d_url}" class="btn-3d">🔗 查看三维标注场景</a>' if view_3d_url else ''}

        <div class="content">
            {html_report}
        </div>

        <div class="footer">
            <p>本邮件由火灾调查复盘系统自动生成</p>
            <p>© {datetime.now().year} Fire Investigation System</p>
        </div>
    </div>
</body>
</html>
        """
        
        return html

    def send_sync(self,
                  to_emails: List[str],
                  subject: str,
                  html_content: str) -> Dict[str, Any]:
        if not self.smtp_host:
            return {
                "success": False,
                "message": "SMTP configuration not found"
            }

        msg = MIMEMultipart("alternative")
        msg["From"] = self.from_email
        msg["To"] = ", ".join(to_emails)
        msg["Subject"] = subject

        html_part = MIMEText(html_content, "html", "utf-8")
        msg.attach(html_part)

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(msg)
            
            return {
                "success": True,
                "message": "Email sent successfully",
                "sent_at": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to send email: {str(e)}"
            }
