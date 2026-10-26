// Pictures and data for the stories of the shared components: they need no network and no Firebase.

// A plain colored picture, as an image address
export const picture = (color: string, width = 400, height = 300) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs><rect width="${width}" height="${height}" fill="url(#g)"/><circle cx="${width * 0.7}" cy="${height * 0.35}" r="${height * 0.14}" fill="#ffffff" fill-opacity="0.7"/></svg>`,
  )}`;

export const PHOTOS = [
  picture('#c98b9e'),
  picture('#8bb7c9'),
  picture('#b7c98b'),
  picture('#c9b58b'),
];
