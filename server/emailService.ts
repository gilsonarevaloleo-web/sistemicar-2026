import { Resend } from 'resend';

let resendSingleton: Resend | null | undefined;

function getResend(): Resend | null {
  if (resendSingleton !== undefined) return resendSingleton;
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    resendSingleton = null;
    return null;
  }
  resendSingleton = new Resend(key);
  return resendSingleton;
}

const welcomeEmailTemplate = (userName?: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a SISTEMICAR</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050505;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0a0a0a; border-radius: 24px; border: 1px solid #3b82f6; box-shadow: 0 0 40px rgba(59, 130, 246, 0.3);">
          
          <!-- Header con logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="font-size: 40px; color: white; font-weight: bold;">S</span>
              </div>
              <h1 style="color: #3b82f6; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: 4px;">
                SISTEMICAR
              </h1>
              <p style="color: #666; font-size: 12px; margin-top: 8px; letter-spacing: 2px;">
                INGENIERÍA DE FUTURO
              </p>
            </td>
          </tr>
          
          <!-- Línea divisoria neón -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #3b82f6 50%, transparent 100%);"></div>
            </td>
          </tr>
          
          <!-- Mensaje principal -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 20px 0; text-align: center;">
                Bienvenido, Iniciado${userName ? ` ${userName}` : ''}.
              </h2>
              
              <p style="color: #a1a1aa; font-size: 16px; line-height: 1.8; margin: 0 0 24px 0; text-align: center;">
                El sistema ha detectado tu registro.
              </p>
              
              <div style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; padding: 20px; border-radius: 0 12px 12px 0; margin: 24px 0;">
                <p style="color: #ffffff; font-size: 15px; line-height: 1.8; margin: 0; font-style: italic;">
                  Tu proceso de ingeniería de futuro para colapsar hitos de realidad comienza ahora.
                </p>
              </div>
              
              <p style="color: #3b82f6; font-size: 18px; font-weight: 600; text-align: center; margin: 32px 0 0 0;">
                No busques resultados, conviértete en el resultado.
              </p>
            </td>
          </tr>
          
          <!-- Botón de acceso -->
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px;">
              <a href="https://sistemicar.app" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; box-shadow: 0 4px 20px rgba(59, 130, 246, 0.4);">
                ACCEDER AL UMBRAL
              </a>
            </td>
          </tr>
          
          <!-- Línea divisoria -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: rgba(255, 255, 255, 0.1);"></div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px;">
              <p style="color: #52525b; font-size: 12px; text-align: center; margin: 0;">
                Este mensaje fue enviado desde el sistema SISTEMICAR.<br>
                Si no reconoces esta actividad, ignora este correo.
              </p>
              <p style="color: #3f3f46; font-size: 11px; text-align: center; margin-top: 16px;">
                © 2025 SISTEMICAR. Todos los derechos reservados.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export interface SendWelcomeEmailParams {
  to: string;
  userName?: string;
}

export async function sendWelcomeEmail({ to, userName }: SendWelcomeEmailParams) {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn('[email] RESEND_API_KEY no configurada — bienvenida omitida');
      return { success: false as const, skipped: true };
    }
    const { data, error } = await resend.emails.send({
      from: 'SISTEMICAR <info@sistemicar.app>',
      to: [to],
      subject: `Bienvenido a SISTEMICAR, ${userName || 'Soberano'} — Tu acceso está activo`,
      html: welcomeEmailTemplate(userName),
    });

    if (error) {
      console.error('Error sending welcome email:', error);
      throw new Error(error.message);
    }

    console.log('Welcome email sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

// Email de confirmación de pago
const paymentConfirmationTemplate = (userName: string, planName: string, amount: number) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago Confirmado - SISTEMICAR</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050505;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" max-width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0a0a0a; border-radius: 24px; border: 1px solid #22c55e; box-shadow: 0 0 40px rgba(34, 197, 94, 0.3);">
          
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <span style="font-size: 40px; color: white;">✓</span>
              </div>
              <h1 style="color: #22c55e; font-size: 24px; font-weight: 800; margin: 0;">
                ¡PAGO CONFIRMADO!
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #22c55e 50%, transparent 100%);"></div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 20px 0; text-align: center;">
                Bienvenido al Plan ${planName}, ${userName}.
              </h2>
              
              <div style="background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); padding: 24px; border-radius: 16px; margin: 24px 0;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">Plan:</td>
                    <td style="color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">Monto:</td>
                    <td style="color: #22c55e; font-size: 18px; font-weight: 700; text-align: right;">$${amount.toFixed(2)} USD</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; font-size: 14px; padding: 8px 0;">Estado:</td>
                    <td style="color: #22c55e; font-size: 14px; font-weight: 600; text-align: right;">✓ Aprobado</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #a1a1aa; font-size: 15px; line-height: 1.8; text-align: center; margin: 24px 0;">
                Tu cuenta se crea en <strong style="color:#ffffff">sistemicar.app/acceso</strong> con Google, usando este mismo correo. Si ya pagaste, el plan se enciende al entrar.
              </p>
            </td>
          </tr>
          
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px;">
              <a href="https://sistemicar.app/acceso" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">
                CREAR CUENTA / ENTRAR
              </a>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: rgba(255, 255, 255, 0.1);"></div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 30px 40px;">
              <p style="color: #52525b; font-size: 12px; text-align: center; margin: 0;">
                Gracias por confiar en SISTEMICAR.<br>
                Si tienes alguna pregunta, responde a este correo.
              </p>
              <p style="color: #3f3f46; font-size: 11px; text-align: center; margin-top: 16px;">
                © 2025 SISTEMICAR. Todos los derechos reservados.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export interface SendPaymentConfirmationParams {
  to: string;
  userName: string;
  planName: string;
  amount: number;
}

export async function sendPaymentConfirmationEmail({ to, userName, planName, amount }: SendPaymentConfirmationParams) {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn('[email] RESEND_API_KEY no configurada — confirmación de pago omitida');
      throw new Error('RESEND_API_KEY no configurada');
    }
    const { data, error } = await resend.emails.send({
      from: 'Sistemicar <info@sistemicar.app>',
      to: [to],
      subject: `[SISTEMICAR] ¡Pago confirmado! Bienvenido al Plan ${planName}`,
      html: paymentConfirmationTemplate(userName, planName, amount),
    });

    if (error) {
      console.error('Error sending payment confirmation email:', error);
      throw new Error(error.message);
    }

    console.log('Payment confirmation email sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Failed to send payment confirmation email:', error);
    throw error;
  }
}

const offerEmailTemplate = (userName: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050505;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0a0a0a; border-radius: 24px; border: 1px solid rgba(245, 158, 11, 0.3); box-shadow: 0 0 40px rgba(245, 158, 11, 0.15);">
          
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <h1 style="color: #f0f0f0; font-size: 28px; font-weight: 800; margin: 0; letter-spacing: 4px;">
                SISTEMICAR
              </h1>
              <p style="color: #f59e0b; font-size: 12px; margin-top: 8px; letter-spacing: 3px;">
                ALQUIMIA DE CONSCIENCIA
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #f59e0b 50%, transparent 100%);"></div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #ffffff; font-size: 22px; font-weight: 700; margin: 0 0 20px 0;">
                ${userName}, tu Doctor IA te espera.
              </h2>
              
              <p style="color: #a1a1aa; font-size: 15px; line-height: 1.8; margin: 0 0 20px 0;">
                Te registraste en SISTEMICAR y queremos que sepas que tu <span style="color: #f59e0b; font-weight: 600;">Doctor IA</span> ya está activo y listo para ayudarte — completamente gratis.
              </p>

              <p style="color: #a1a1aa; font-size: 15px; line-height: 1.8; margin: 0 0 24px 0;">
                El Doctor IA es un mentor clínico-analítico que aplica las <span style="color: #ffffff; font-weight: 600;">Leyes Soberanas</span> a tu situación personal. No te motiva con frases vacías — te diagnostica con precisión y te da un camino de acción.
              </p>

              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 0 0 30px 0;">
                    <a href="https://sistemicar.app" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 12px; font-size: 14px; font-weight: 700; letter-spacing: 2px; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.3);">
                      HABLAR CON EL DOCTOR IA
                    </a>
                  </td>
                </tr>
              </table>

              <div style="height: 1px; background: rgba(255, 255, 255, 0.06); margin: 0 0 24px 0;"></div>

              <p style="color: #71717a; font-size: 14px; line-height: 1.7; margin: 0 0 16px 0;">
                Y cuando estés listo para ir más profundo, existen herramientas diseñadas para los que buscan transformación real:
              </p>

              <div style="background: rgba(99, 102, 241, 0.08); border-left: 3px solid #6366f1; padding: 16px; border-radius: 0 10px 10px 0; margin: 0 0 12px 0;">
                <p style="color: #818cf8; font-size: 14px; font-weight: 700; margin: 0 0 6px 0;">Espejo Clínico</p>
                <p style="color: #888; font-size: 12px; line-height: 1.6; margin: 0;">Protocolo de 4 ejes: desmonta la niebla mental, identifica tus programas inconscientes, activa tu voltaje interno y diseña tu protocolo de acción.</p>
              </div>

              <div style="background: rgba(16, 185, 129, 0.08); border-left: 3px solid #10b981; padding: 16px; border-radius: 0 10px 10px 0; margin: 0 0 24px 0;">
                <p style="color: #10b981; font-size: 14px; font-weight: 700; margin: 0 0 6px 0;">Planificación Soberana</p>
                <p style="color: #888; font-size: 12px; line-height: 1.6; margin: 0;">Sistema de vehículos, segmentos de día y motor de transmutación. Convierte tu caos diario en estructura con puntos de soberanía.</p>
              </div>

              <p style="color: #555; font-size: 13px; line-height: 1.6; margin: 0; text-align: center; font-style: italic;">
                La decisión siempre es tuya, ${userName}. El sistema esperará a que estés listo.
              </p>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: rgba(255, 255, 255, 0.06);"></div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 24px 40px;">
              <p style="color: #3f3f46; font-size: 11px; text-align: center; margin: 0;">
                SISTEMICAR — Alquimia de Consciencia
              </p>
              <p style="color: #333; font-size: 10px; text-align: center; margin: 8px 0 0 0;">
                Si no deseas recibir más correos, responde con "DESUSCRIBIR".
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export interface SendOfferEmailParams {
  to: string;
  userName?: string;
}

export async function sendOfferEmail({ to, userName }: SendOfferEmailParams) {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn('[email] RESEND_API_KEY no configurada — oferta omitida');
      return { success: false as const, skipped: true };
    }
    const name = userName || 'Soberano';
    const { data, error } = await resend.emails.send({
      from: 'SISTEMICAR <info@sistemicar.app>',
      to: [to],
      subject: `${name}, tu Doctor IA te espera en SISTEMICAR`,
      html: offerEmailTemplate(name),
    });

    if (error) {
      console.error('Error sending offer email:', error);
      throw new Error(error.message);
    }

    console.log('Offer email sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Failed to send offer email:', error);
    throw error;
  }
}

const apiKeyEmailTemplate = (userName: string, apiKey: string, planName: string, callLimit: number, expiresAt: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu API Key — SISTEMICAR</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050505; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050505;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #0a0a0a; border-radius: 24px; border: 1px solid #00FFC330; box-shadow: 0 0 40px rgba(0, 255, 195, 0.15);">

          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <h1 style="color: #00FFC3; font-size: 24px; font-weight: 800; margin: 0; letter-spacing: 4px;">
                SISTEMICAR API
              </h1>
              <p style="color: #666; font-size: 12px; margin-top: 8px; letter-spacing: 2px;">
                DETECCIÓN DE INTERFAZ CONDUCTUAL
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, #00FFC3 50%, transparent 100%);"></div>
            </td>
          </tr>

          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 8px 0; text-align: center;">
                ¡Tu acceso a la API está listo, ${userName}!
              </h2>
              <p style="color: #a1a1aa; font-size: 14px; text-align: center; margin: 0 0 28px 0;">
                Plan <strong style="color: #00FFC3;">${planName}</strong> activado correctamente.
              </p>

              <p style="color: #e2e8f0; font-size: 13px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: 1px;">
                TU API KEY (guárdala en un lugar seguro):
              </p>
              <div style="background: #000; border: 1px solid #00FFC350; border-radius: 12px; padding: 16px; margin: 0 0 24px 0; word-break: break-all;">
                <code style="color: #00FFC3; font-size: 13px; font-family: 'Courier New', monospace; letter-spacing: 1px;">
                  ${apiKey}
                </code>
              </div>

              <div style="background: rgba(0,255,195,0.06); border: 1px solid #00FFC320; border-radius: 16px; padding: 20px; margin: 0 0 24px 0;">
                <table width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="color: #a1a1aa; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #0f2a25;">Plan:</td>
                    <td style="color: #ffffff; font-size: 13px; font-weight: 600; text-align: right; border-bottom: 1px solid #0f2a25;">${planName}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #0f2a25;">Llamadas/mes:</td>
                    <td style="color: #00FFC3; font-size: 13px; font-weight: 700; text-align: right; border-bottom: 1px solid #0f2a25;">${callLimit.toLocaleString("es-PE")}</td>
                  </tr>
                  <tr>
                    <td style="color: #a1a1aa; font-size: 13px; padding: 8px 0;">Válida hasta:</td>
                    <td style="color: #ffffff; font-size: 13px; text-align: right;">${expiresAt}</td>
                  </tr>
                </table>
              </div>

              <div style="background: rgba(212, 175, 55, 0.08); border-left: 3px solid #D4AF37; padding: 16px; border-radius: 0 12px 12px 0; margin: 0 0 24px 0;">
                <p style="color: #D4AF37; font-size: 13px; font-weight: 700; margin: 0 0 8px 0;">Cómo usar tu API key:</p>
                <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 4px 0; font-family: monospace;">
                  POST https://sistemicar.app/api/public/detect-interface
                </p>
                <p style="color: #a1a1aa; font-size: 12px; margin: 0; font-family: monospace;">
                  Header: X-Api-Key: ${apiKey.slice(0, 8)}...
                </p>
              </div>

              <p style="color: #52525b; font-size: 12px; text-align: center; margin: 0;">
                Documentación completa: <a href="https://sistemicar.app/api/public/docs" style="color: #00FFC3;">sistemicar.app/api/public/docs</a>
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 0 40px 40px 40px;">
              <a href="https://sistemicar.app/api-checkout" style="display: inline-block; background: linear-gradient(135deg, #00FFC3 0%, #00a87a 100%); color: #050505; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-size: 13px; font-weight: 800; letter-spacing: 2px;">
                IR AL PANEL DE DOCS
              </a>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: rgba(255, 255, 255, 0.06);"></div>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px;">
              <p style="color: #3f3f46; font-size: 11px; text-align: center; margin: 0;">
                SISTEMICAR API — Si no realizaste esta compra, contáctanos respondiendo este correo.<br>
                © 2025 SISTEMICAR. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export interface SendApiKeyEmailParams {
  to: string;
  userName: string;
  apiKey: string;
  planName: string;
  callLimit: number;
  expiresAt: Date;
}

export async function sendApiKeyEmail({ to, userName, apiKey, planName, callLimit, expiresAt }: SendApiKeyEmailParams) {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn('[email] RESEND_API_KEY no configurada — correo API key omitido');
      throw new Error('RESEND_API_KEY no configurada');
    }
    const expiresStr = expiresAt.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
    const { data, error } = await resend.emails.send({
      from: 'SISTEMICAR API <info@sistemicar.app>',
      to: [to],
      subject: `[SISTEMICAR API] Tu clave de acceso — Plan ${planName}`,
      html: apiKeyEmailTemplate(userName, apiKey, planName, callLimit, expiresStr),
    });
    if (error) {
      console.error('Error sending API key email:', error);
      throw new Error(error.message);
    }
    console.log('API key email sent successfully:', data?.id);
    return { success: true, id: data?.id };
  } catch (error) {
    console.error('Failed to send API key email:', error);
    throw error;
  }
}
