/**
 * Every photograph in the application is declared here and nowhere else.
 *
 * Two modes, controlled by VITE_IMAGE_SOURCE:
 *   'remote' (default) — images stream from Unsplash's CDN
 *   'local'            — images are read from /images/... after you have run
 *                        `npm run fetch-images` at the project root
 *
 * Swapping any picture is a one-line edit in this file. If a remote URL ever
 * stops resolving, <Photo> falls back to a deterministic stand-in rather than
 * collapsing the layout, so a dead link degrades quietly instead of breaking
 * a page.
 *
 * All Unsplash photographs are free to use under the Unsplash licence.
 * Replace them with your own commissioned photography before a real launch.
 */

const SOURCE = import.meta.env.VITE_IMAGE_SOURCE || "remote";

/** Unsplash photo ids, grouped by the job each picture does. */
export const PHOTOS = {
  // ---------------------------------------------------------------- hero
  heroGolden: {
    id: "photo-1587174486073-ae5e5cff23aa",
    local: "/images/hero/golden-hour.jpg",
    alt: "A lone golfer walking a fairway in low golden light",
  },
  heroAlt: {
    id: "photo-1535131749006-b7f58c99034b",
    local: "/images/hero/links-dusk.jpg",
    alt: "Open links land under a wide evening sky",
  },

  // ---------------------------------------------------------------- golf
  golfWalking: {
    id: "photo-1693163537665-b7c5a5f01f75",
    local: "/images/golf/walking.jpg",
    alt: "A golfer walking across a lush green golf course",
  },
  golfSwing: {
    id: "photo-1592919505780-303950717480",
    local: "/images/golf/swing.jpg",
    alt: "A golfer at the top of a backswing",
  },
  golfCard: {
    id: "photo-1632946269126-0f8edbe8b068",
    local: "/images/golf/scorecard.jpg",
    alt: "A golf ball sitting on a green field",
  },
  golfGroup: {
    id: "photo-1611374243147-44a702c2d44c",
    local: "/images/golf/fourball.jpg",
    alt: "Four players crossing a fairway together",
  },

  // ------------------------------------------------------------- charity
  charityHands: {
    id: "photo-1593113630400-ea4288922497",
    local: "/images/charity/hands.jpg",
    alt: "Two people holding hands across a table",
  },
  charityVolunteers: {
    id: "photo-1559027615-cd4628902d4a",
    local: "/images/charity/volunteers.jpg",
    alt: "Volunteers sorting supplies in a community hall",
  },
  charityCommunity: {
    id: "photo-1526976668912-1a811878dd37",
    local: "/images/charity/community.jpg",
    alt: "People gathered together outdoors in conversation",
  },
  charityChildren: {
    id: "photo-1503676260728-1c00da094a0b",
    local: "/images/charity/classroom.jpg",
    alt: "Children working at desks in a classroom",
  },
  charityEnvironment: {
    id: "photo-1441974231531-c6227db76b6e",
    local: "/images/charity/woodland.jpg",
    alt: "Sunlight through the canopy of a young woodland",
  },

  // -------------------------------------------------------------- impact
  impactPortrait: {
    id: "photo-1552058544-f2b08422138a",
    local: "/images/impact/portrait.jpg",
    alt: "A portrait of a man looking directly at the camera",
  },
  impactHelping: {
    id: "photo-1488521787991-ed7bbaae773c",
    local: "/images/impact/helping.jpg",
    alt: "Two people working side by side",
  },
  impactCelebrate: {
    id: "photo-1543269865-cbf427effbad",
    local: "/images/impact/celebrate.jpg",
    alt: "A group raising their arms in celebration",
  },

  // ---------------------------------------------------------------- draw
  drawEvening: {
    id: "photo-1500932334442-8761ee4810a7",
    local: "/images/draw/evening.jpg",
    alt: "A dark textured surface lit from one side",
  },

  // -------------------------------------------------------------- account
  authSide: {
    id: "photo-1752661497400-7901a834601a",
    local: "/images/hero/auth.jpg",
    alt: "A golfer preparing to swing on a sunny golf course",
  },
};

/**
 * Builds a URL for a declared photo at the width you actually need, so a
 * thumbnail never downloads a 3000px original.
 */
export function photo(key, width = 1200) {
  const entry = PHOTOS[key];
  if (!entry) return { src: "", alt: "", fallback: key };

  const src =
    SOURCE === "local"
      ? entry.local
      : `https://images.unsplash.com/${entry.id}?auto=format&fit=crop&w=${width}&q=72`;

  return { src, alt: entry.alt, fallback: entry.alt };
}

/**
 * Charities carry their own image_url from the database. This keeps that
 * working while giving anything without a picture a sensible one based on the
 * cause, so the directory never shows a grey rectangle.
 */
const BY_CATEGORY = {
  "Mental health": "charityHands",
  Veterans: "impactPortrait",
  Environment: "charityEnvironment",
  Children: "charityChildren",
  Education: "charityChildren",
  Animals: "charityCommunity",
  General: "charityVolunteers",
};

export function charityPhoto(charity, width = 900) {
  if (charity?.image_url) {
    return {
      src: charity.image_url,
      alt: `${charity.name}'s work`,
      fallback: charity.name,
    };
  }
  const key = BY_CATEGORY[charity?.category] || "charityVolunteers";
  const p = photo(key, width);
  return {
    ...p,
    alt: `${charity?.name || "Charity"} — ${p.alt}`,
    fallback: charity?.name,
  };
}

export default PHOTOS;
