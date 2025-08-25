/*
 * File Name         : AppContext.tsx
 * Description       : App context to provide Obsidian app instance in React components
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 20/08/2025 21:59:38
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 25/08/2025 21:01:40
 */

import { App } from 'obsidian';
import { createContext, useContext } from 'react';

export const AppContext = createContext<App | undefined>(undefined);

export const useApp = (): App | undefined => {
    return useContext(AppContext);
};
