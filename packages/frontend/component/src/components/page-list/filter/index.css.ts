import { style } from '@vanilla-extract/css';

export const menuItemStyle = style({
  fontSize: 'var(--affine-font-xs)',
});
export const variableSelectTitleStyle = style({
  margin: '7px 16px',
  fontWeight: 500,
  lineHeight: '20px',
  fontSize: 'var(--affine-font-xs)',
  color: 'var(--affine-text-secondary-color)',
});
export const variableSelectDividerStyle = style({
  marginTop: '2px',
  marginBottom: '2px',
  marginLeft: '12px',
  marginRight: '8px',
  height: '1px',
  background: 'var(--affine-border-color)',
});
export const menuItemTextStyle = style({
  fontSize: 'var(--affine-font-xs)',
});
export const filterItemStyle = style({
  display: 'flex',
  border: '1px solid var(--affine-border-color)',
  borderRadius: '8px',
  background: 'var(--affine-white)',
  padding: '4px 8px',
  overflow: 'hidden',
});

export const filterItemCloseStyle = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  marginLeft: '4px',
});
export const inputStyle = style({
  fontSize: 'var(--affine-font-xs)',
  padding: '2px 4px',
  transition: 'all 0.15s ease-in-out',
  ':hover': {
    cursor: 'pointer',
    background: 'var(--affine-hover-color)',
    borderRadius: '4px',
  },
});
export const switchStyle = style({
  fontSize: 'var(--affine-font-xs)',
  color: 'var(--affine-text-secondary-color)',
  padding: '2px 4px',
  transition: 'all 0.15s ease-in-out',
  display: 'flex',
  alignItems: 'center',
  ':hover': {
    cursor: 'pointer',
    background: 'var(--affine-hover-color)',
    borderRadius: '4px',
  },
  whiteSpace: 'nowrap',
});
export const filterTypeStyle = style({
  fontSize: 'var(--affine-font-sm)',
  display: 'flex',
  alignItems: 'center',
  padding: '2px 4px',
  transition: 'all 0.15s ease-in-out',
  marginRight: '6px',
  ':hover': {
    cursor: 'pointer',
    background: 'var(--affine-hover-color)',
    borderRadius: '4px',
  },
});
export const filterTypeIconStyle = style({
  fontSize: 'var(--affine-font-base)',
  marginRight: '6px',
  padding: '1px 0',
  display: 'flex',
  alignItems: 'center',
  color: 'var(--affine-icon-color)',
});
