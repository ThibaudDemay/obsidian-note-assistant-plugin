/*
 * File Name         : GlobalStatus.ts
 * Description       : Types for global status component
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 21/08/2025 22:09:36
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 18:36:00
 */

export type ServiceStatus = {
    label: string;
    icon: string;
    info: string;
    class: string;
};

export type StatusProps = {
    status: ServiceStatus;
};
