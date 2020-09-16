import * as React from "react";

interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({onClick, children}) => {
  //@ts-ignore
  const [startTransition, pending] = React.useTransition({ timeoutMs: 10000 });

  const handleClick = () => {
    startTransition(() => { onClick(); });
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={pending}
      >
        {children}
      </button>
      { pending ? 'Loading...' : null }
    </>
  );
}