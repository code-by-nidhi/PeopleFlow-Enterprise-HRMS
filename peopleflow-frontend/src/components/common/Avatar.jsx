import React, { useState } from 'react';
import { fileUrl } from '../../api/client';
import { initials } from '../../utils/format';

export function Avatar({ name, src, size = 36 }) {
  const [failed, setFailed] = useState(false);
  const url = fileUrl(src);

  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: Math.max(size * 0.36, 11) }} aria-hidden="true">
      {url && !failed ? <img src={url} alt="" loading="lazy" onError={() => setFailed(true)} /> : initials(name)}
    </span>
  );
}

/** Avatar + name + secondary line, used in tables and lists. */
export function PersonCell({ name, subtitle, avatar, size = 36 }) {
  return (
    <div className="person-cell">
      <Avatar name={name} src={avatar} size={size} />
      <div>
        <div className="cell-primary truncate">{name || '—'}</div>
        {subtitle && <div className="cell-secondary truncate">{subtitle}</div>}
      </div>
    </div>
  );
}
