import React from "react";
import labSvg from "../assets/images/lab-placeholder.svg?raw";
import bodegaSvg from "../assets/images/bodega-placeholder.svg?raw";
import cytometerSvg from "../assets/images/cytometer-placeholder.svg?raw";
import "../styles/RoomIllustration.css";

const normalizeName = (s) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

// Default picture for a sala with no (working) image URL, chosen by name
// (case/accents ignored). Anything not listed gets the biochemistry lab.
const ROOM_ILLUSTRATIONS = [
  { match: /^bodega\b/, svg: bodegaSvg },
  { match: /^243\b/, svg: cytometerSvg }, // sala con citómetro de flujo
];

// The SVG is rendered inline (not as <img>) so CSS can animate its parts while
// the card is hovered (see RoomIllustration.css). The markup only ever comes
// from our own files in src/assets/images, never from user data.
export default function RoomIllustration({ name }) {
  const n = normalizeName(name);
  const svg = ROOM_ILLUSTRATIONS.find((r) => r.match.test(n))?.svg ?? labSvg;
  return (
    <span
      className="room-ill"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
