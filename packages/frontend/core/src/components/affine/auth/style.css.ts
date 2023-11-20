import { globalStyle, style } from '@vanilla-extract/css';

export const authModalContent = style({
  marginTop: '30px',
});

export const captchaWrapper = style({
  margin: 'auto',
  marginBottom: '4px',
  textAlign: 'center',
});

export const authMessage = style({
  marginTop: '30px',
  color: 'var(--affine-text-secondary-color)',
  fontSize: 'var(--affine-font-xs)',
  lineHeight: 1.5,
});
globalStyle(`${authMessage} a`, {
  color: 'var(--affine-link-color)',
});
globalStyle(`${authMessage} .link`, {
  cursor: 'pointer',
  color: 'var(--affine-link-color)',
});

export const forgetPasswordButton = style({
  fontSize: 'var(--affine-font-sm)',
  color: 'var(--affine-text-secondary-color)',
  position: 'absolute',
  right: 0,
  bottom: 0,
  display: 'none',
});

export const resendWrapper = style({
  height: 77,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 30,
});

export const resendCountdown = style({ width: 45, textAlign: 'center' });
export const resendCountdownInButton = style({
  width: 40,
  textAlign: 'center',
  fontSize: 'var(--affine-font-sm)',
  marginLeft: 16,
  color: 'var(--affine-blue)',
  fontWeight: 400,
});

export const accessMessage = style({
  textAlign: 'center',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: 'var(--affine-font-xs)',
  fontWeight: 500,
  marginTop: 65,
  marginBottom: 40,
});

export const userPlanButton = style({
  display: 'flex',
  fontSize: 'var(--affine-font-xs)',
  height: 20,
  fontWeight: 500,
  cursor: 'pointer',
  color: 'var(--affine-pure-white)',
  backgroundColor: 'var(--affine-brand-color)',
  padding: '0 4px',
  borderRadius: 4,
  justifyContent: 'center',
  alignItems: 'center',
});
