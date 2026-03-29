"use client";

import { useState } from "react";

type Props = {
  name: string;
  /** DB / サーバーからの値。厳密に true のときだけ初期チェック */
  initialClosed: boolean;
  disabled: boolean;
};

export function ClosedDayCheckbox({ name, initialClosed, disabled }: Props) {
  const [isClosed, setIsClosed] = useState(() => initialClosed === true);

  return (
    <input
      type="checkbox"
      name={name}
      checked={isClosed}
      onChange={(e) => setIsClosed(e.target.checked)}
      disabled={disabled}
    />
  );
}
