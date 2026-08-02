import * as React from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

import { Input, type InputProps } from '@/components/ui/input';

export type PasswordInputProps = Omit<InputProps, 'type' | 'endAdornment'>;

/**
 * Password field with a show/hide toggle.
 *
 * The toggle is a real `<button type="button">` (never a bare icon) so it is
 * reachable by keyboard and never submits the form. Its accessible name flips
 * with state, and `aria-pressed` exposes whether the password is currently
 * revealed — a screen-reader user gets the same information a sighted user
 * reads from the crossed-out eye.
 */
const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ startIcon = <Lock />, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <Input
        ref={ref}
        type={visible ? 'text' : 'password'}
        startIcon={startIcon}
        endAdornment={
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4"
          >
            {visible ? <EyeOff /> : <Eye />}
          </button>
        }
        {...props}
      />
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
