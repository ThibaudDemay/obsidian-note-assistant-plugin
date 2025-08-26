/*
 * File Name         : types-location.js
 * Description       : ESLint rule to enforce that exported TypeScript interfaces/types are located
 *                     in the `src/@types` directory.
 * Author            : Thibaud Demay (thibaud@demay.dev)
 * Created At        : 25/08/2025 18:57:00
 * ----
 * Last Modified By  : Thibaud Demay (thibaud@demay.dev)
 * Last Modified At  : 26/08/2025 16:23:48
 */

module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "Exported TypeScript interfaces/types must be in the `src/@types` directory.",
    },
    messages: {
      wrongLocation: "Exported interfaces/types must be placed in `src/@types/`.",
    },
  },
  create(context) {
    return {
      ExportNamedDeclaration(node) {
        // Check if the node is an exported interface or type
        if (
          node.declaration?.type === "TSInterfaceDeclaration" ||
          node.declaration?.type === "TSTypeAliasDeclaration"
        ) {
          const filePath = context.filename;
          // Check if the file is inside `src/@types/`
          if (!filePath.includes("/src/@types/") && !filePath.includes("\\src\\@types\\")) {
            context.report({
              node,
              messageId: "wrongLocation",
            });
          }
        }
      },
    };
  },
};
