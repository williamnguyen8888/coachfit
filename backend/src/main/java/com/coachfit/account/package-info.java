/**
 * Account module — GDPR user rights surfaces (docs/11-privacy-compliance.md §3, §8).
 *
 * <p>Exposes:
 * <ul>
 *   <li>GET  /api/v1/account/export        — async data export (Art. 15 / Art. 20)</li>
 *   <li>DELETE /api/v1/account             — soft-delete with 30-day grace period (Art. 17)</li>
 *   <li>POST /api/v1/account/cancel-deletion — cancel pending deletion</li>
 *   <li>PUT  /api/v1/account/restrict      — toggle processing restriction (Art. 18)</li>
 *   <li>GET  /api/v1/account/privacy       — current privacy settings + consent log</li>
 * </ul>
 *
 * <p>Spring Modulith boundary: depends on {@code shared}, {@code consent}, and the
 * {@code auth-persistence-ports} named interface from the {@code auth} module.
 */
@org.springframework.modulith.ApplicationModule(
        allowedDependencies = {
                "shared",
                "consent :: consent-api",
                "auth :: auth-persistence-ports"
        }
)
package com.coachfit.account;
