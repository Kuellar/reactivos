import React, { useState } from "react";
import { RightOutlined } from "@ant-design/icons";

// Clickable room card for Home: cover image on top, name + meta line below.
// If `img` is empty or fails to load, `fallback` (a node, e.g. <RoomIllustration>)
// is shown instead.
export default function ButtonCard({ title, meta, img, fallback, onClick }) {
  // Remember which URL failed, so a new URL gets a fresh try without resetting state.
  const [failedSrc, setFailedSrc] = useState(null);
  const showImg = Boolean(img) && img !== failedSrc;

  return (
    <button type="button" className="room-card" onClick={onClick}>
      <span className="room-card__media">
        {showImg ? (
          <img src={img} alt="" loading="lazy" onError={() => setFailedSrc(img)} />
        ) : (
          fallback
        )}
      </span>
      <span className="room-card__body">
        <span className="room-card__text">
          <span className="room-card__name" title={title}>
            {title}
          </span>
          <span className="room-card__meta">{meta}</span>
        </span>
        <RightOutlined className="room-card__arrow" />
      </span>
    </button>
  );
}
