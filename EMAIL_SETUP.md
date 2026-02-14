# Email Setup Instructions

The form is configured to send emails using EmailJS. Follow these steps:

## 1. Create an EmailJS Account
- Go to [https://www.emailjs.com/](https://www.emailjs.com/)
- Sign up for a free account

## 2. Set Up Your Email Service
- After logging in, go to "Email Services"
- Click "Add New Service"
- Choose your email provider (Gmail recommended)
- Follow the prompts to connect your email account
- Note your **Service ID**

## 3. Create an Email Template
- Go to "Email Templates"
- Click "Create New Template"
- Use these template variables in your email template:
  - `{{to_email}}` - Recipient (emily@thisjones.com)
  - `{{from_name}}` - Guest name
  - `{{from_email}}` - Guest email
  - `{{plus_one}}` - Yes/No
  - `{{bringing_kids}}` - Yes/No
  - `{{kid_count}}` - Number of kids
  - `{{message}}` - Guest message

Example template:
```
New RSVP from {{from_name}}

Email: {{from_email}}
Plus One: {{plus_one}}
Bringing Kids: {{bringing_kids}}
Number of Kids: {{kid_count}}

Message:
{{message}}
```

- Note your **Template ID**

## 4. Get Your Public Key
- Go to "Account" → "General"
- Copy your **Public Key**

## 5. Create Your .env File
- Copy `.env.example` to `.env`:
  ```bash
  cp .env.example .env
  ```
- Open `.env` and add your credentials:
  ```
  VITE_EMAILJS_SERVICE_ID=your_actual_service_id
  VITE_EMAILJS_TEMPLATE_ID=your_actual_template_id
  VITE_EMAILJS_PUBLIC_KEY=your_actual_public_key
  ```

## 6. Restart Your Dev Server
```bash
npm run dev
```

## For Production Deployment
Make sure to add these environment variables to your IONOS hosting:
- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_TEMPLATE_ID`
- `VITE_EMAILJS_PUBLIC_KEY`

---

**Alternative: FormSubmit (No Signup Required)**

If you prefer a simpler option without creating an account, you can use FormSubmit instead. Let me know if you'd prefer this approach!
