/*
 * File Name         : crypto.ts
 * Description       : Cryptographic utilities
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 22:29:38
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 26/08/2025 22:39:37
 */

export async function sha256(message: string): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
