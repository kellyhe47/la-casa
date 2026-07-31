// STUB — ticket 010 (PRD v2 §5, Workstream D). Not implemented yet.
//
// Home for the global, permanent asset cache seam used by /image and /tts.
// Contract pinned by server/assetCache.test.js:
//
//   cacheVersion()                 -> process.env.ASSET_CACHE_VERSION, read per
//                                     call; unset/empty means no prefix
//   imageCacheKey(word)            -> `img:<word>`        (+ `<version>:` prefix)
//   ttsCacheKey({text,voiceId,lang})
//                                  -> `tts:<sha256(`${text}|${voiceId}|${lang}`)>`
//                                     lowercase hex, utf8 (+ `<version>:` prefix)
//
// Lookups go through `store.getAsset(key)`; stores through
// `store.putAsset({key, kind, mime, bytes})`. Nothing is stored for a failed
// upstream call, and nothing expires.
