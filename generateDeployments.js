import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Setup __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Input files
const configs = {
  mainnet: JSON.parse(
    fs.readFileSync(path.join(__dirname, "config/mainnet_config.json"), "utf-8")
  ),
  testnet: JSON.parse(
    fs.readFileSync(path.join(__dirname, "config/testnet_config.json"), "utf-8")
  ),
};

// Output folder
const outputBase = path.join(__dirname, "deployments");

// Define contract types to generate tables for
const CONTRACT_KEYS = [
  "mailbox",
  "interchainAccountRouter",
  "interchainGasPaymaster",
  "validatorAnnounce",
  "merkleTreeHook",
  "proxyAdmin",
  "storageGasOracle",
  "testRecipient",
];

// Utility
const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

// Generates an MDX table body string
function generateTableRows(data, contractKey) {
  return Object.entries(data.chains)
    .map(([chain, config]) => {
      const address = config?.[contractKey];
      if (!address) return null;

      const displayName = config.displayName || capitalize(chain);
      const domainId = config.domainId ?? "N/A";
      const chainId = config.chainId ?? "N/A";
      const explorerUrl = config.blockExplorers?.[0]?.url ?? "";
      const explorer = explorerUrl
        ? `[${
            new URL(explorerUrl).hostname
          }](${explorerUrl}/address/${address})`
        : "N/A";

      return `| ${displayName} | ${domainId} | ${chainId} | \`${address}\` | ${explorer} |`;
    })
    .filter(Boolean)
    .join("\n");
}

// Main generator
for (const [env, config] of Object.entries(configs)) {
  const outDir = path.join(outputBase, env);
  fs.mkdirSync(outDir, { recursive: true });

  for (const key of CONTRACT_KEYS) {
    const rows = generateTableRows(config, key);
    if (!rows) continue;

    const frontmatter = `---
title: "${capitalize(key)}"
description: "${capitalize(key)} deployments on ${
      env.charAt(0).toUpperCase() + env.slice(1)
    }"
---`;

    const tableHeader = `| Chain | Domain ID | Chain ID | Address | Explorer |
|-------|-----------|----------|---------|----------|`;

    const content = `${frontmatter}

${tableHeader}
${rows}
`;

    const filePath = path.join(outDir, `${key}.mdx`);
    fs.writeFileSync(filePath, content.trim() + "\n", "utf-8");
    console.log(`✅ Wrote ${key}.mdx to deployments/${env}/`);
  }
}
