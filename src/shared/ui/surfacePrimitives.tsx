import { forwardRef } from 'react';
import {
  Button as SharedButton,
  Card as SharedCard,
  FormField as SharedFormField,
  type ButtonProps as SharedButtonProps,
  type CardProps as SharedCardProps,
  type FormFieldProps as SharedFormFieldProps,
} from 'pi-kiosk-shared/ui';

export type ButtonProps = Omit<SharedButtonProps, 'surface'>;
export const Button = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => (
  <SharedButton ref={ref} surface="pickup" {...props} />
));
Button.displayName = 'Button';

export type CardProps = Omit<SharedCardProps, 'surface'>;
export const Card = forwardRef<HTMLDivElement, CardProps>((props, ref) => (
  <SharedCard ref={ref} surface="pickup" {...props} />
));
Card.displayName = 'Card';

export type FormFieldProps = SharedFormFieldProps;
export const FormField = SharedFormField;
