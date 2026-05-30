/**
 * API Key management module.
 *
 * <p>Handles creation, listing, and revocation of user API keys.
 * Keys are stored as SHA-256 hashes; the raw key is shown only once on creation.
 *
 * <p>Key format (docs/08-auth-model.md §API Key Authentication):
 * <pre>
 *   cf_live_ + 32-char secure random hex  (total 40 chars)
 *   stored:  SHA-256(rawKey) as hex string
 *   prefix:  first 8 chars e.g. "cf_live_" used as display hint
 * </pre>
 */
package com.coachfit.apikey;
