/*
 * File Name         : css-modules.d.ts
 * Description       : Types for css modules
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:09:36
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 19:08:54
 */

declare module '*.module.css' {
    const classes: { [key: string]: string };
    export default classes;
}
