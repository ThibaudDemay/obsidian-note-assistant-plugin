/*
 * File Name         : crypto.ts
 * Description       : Cryptographic utilities
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 22:29:38
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 22:34:53
 */

class SHA256 {
    private static readonly K: Uint32Array = new Uint32Array([
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ]);

    private static readonly H0: Uint32Array = new Uint32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);

    private static readonly W: Uint32Array = new Uint32Array(64);

    private static rotr(n: number, x: number): number {
        return (x >>> n) | (x << (32 - n));
    }

    private static sigma0(x: number): number {
        return this.rotr(2, x) ^ this.rotr(13, x) ^ this.rotr(22, x);
    }

    private static sigma1(x: number): number {
        return this.rotr(6, x) ^ this.rotr(11, x) ^ this.rotr(25, x);
    }

    private static gamma0(x: number): number {
        return this.rotr(7, x) ^ this.rotr(18, x) ^ (x >>> 3);
    }

    private static gamma1(x: number): number {
        return this.rotr(17, x) ^ this.rotr(19, x) ^ (x >>> 10);
    }

    private static ch(x: number, y: number, z: number): number {
        return (x & y) ^ (~x & z);
    }

    private static maj(x: number, y: number, z: number): number {
        return (x & y) ^ (x & z) ^ (y & z);
    }

    public static async hash(message: string): Promise<string> {
    // Convertir le message en UTF-8 et le représenter en octets
        const msgBuffer = new TextEncoder().encode(message);
        const length = msgBuffer.length * 8;
        const blockCount = Math.ceil((msgBuffer.length + 9) / 64);
        const blocks = new Uint8Array(blockCount * 64);

        // Copier le message dans le tableau de blocs
        blocks.set(msgBuffer);

        // Ajouter le bit '1' à la fin du message
        blocks[msgBuffer.length] = 0x80;

        // Ajouter la longueur du message (en bits) à la fin du dernier bloc
        const view = new DataView(blocks.buffer);
        view.setUint32(blocks.length - 4, length, false);

        // Initialiser les variables de hachage
        const h = new Uint32Array(this.H0);

        // Traiter chaque bloc
        for (let i = 0; i < blockCount; i++) {
            const block = new Uint32Array(blocks.buffer, i * 64, 16);

            // Préparer le tableau de mots
            for (let t = 0; t < 16; t++) {
                this.W[t] = block[t];
            }
            for (let t = 16; t < 64; t++) {
                this.W[t] = (
                    this.gamma1(this.W[t - 2]) +
          this.W[t - 7] +
          this.gamma0(this.W[t - 15]) +
          this.W[t - 16]
                ) >>> 0;
            }

            // Initialiser les variables de travail
            let [a, b, c, d, e, f, g, h0] = h;

            // Compression du bloc
            for (let t = 0; t < 64; t++) {
                const T1 = (h0 + this.sigma1(e) + this.ch(e, f, g) + this.K[t] + this.W[t]) >>> 0;
                const T2 = (this.sigma0(a) + this.maj(a, b, c)) >>> 0;

                h0 = g;
                g = f;
                f = e;
                e = (d + T1) >>> 0;
                d = c;
                c = b;
                b = a;
                a = (T1 + T2) >>> 0;
            }

            // Mettre à jour les variables de hachage
            h[0] = (h[0] + a) >>> 0;
            h[1] = (h[1] + b) >>> 0;
            h[2] = (h[2] + c) >>> 0;
            h[3] = (h[3] + d) >>> 0;
            h[4] = (h[4] + e) >>> 0;
            h[5] = (h[5] + f) >>> 0;
            h[6] = (h[6] + g) >>> 0;
            h[7] = (h[7] + h0) >>> 0;
        }

        // Convertir le résultat en chaîne hexadécimale
        const result = new Uint8Array(h.buffer);
        return Array.from(result)
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
    }
}

export async function sha256(message: string): Promise<string> {
    return SHA256.hash(message);
}
