import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? "end of input"}`);
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function required(args, key) {
  const value = args[key];
  if (!value) throw new Error(`Missing --${key}`);
  return value;
}

function normalizeBlockNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || value.length === 0) return null;
  return value.startsWith("0x") ? Number.parseInt(value, 16) : Number.parseInt(value, 10);
}

function contractDeployment(run, contractName) {
  const transaction = run.transactions?.find(
    (item) => item.contractName === contractName && item.contractAddress,
  );
  if (!transaction) throw new Error(`No ${contractName} deployment found`);

  const transactionHash = transaction.hash ?? transaction.transactionHash;
  const receipt = run.receipts?.find(
    (item) => item.transactionHash?.toLowerCase() === transactionHash?.toLowerCase(),
  );

  return {
    address: transaction.contractAddress,
    transactionHash: transactionHash ?? null,
    blockNumber: normalizeBlockNumber(receipt?.blockNumber),
  };
}

const args = parseArgs(process.argv.slice(2));
const productionRun = JSON.parse(readFileSync(resolve(required(args, "production-run")), "utf8"));
const mockRunPath = args["mock-run"];
const mockRun = mockRunPath ? JSON.parse(readFileSync(resolve(mockRunPath), "utf8")) : null;

const output = {
  network: "base-sepolia",
  chainId: 84532,
  status: "deployed",
  sourceCommit: required(args, "source-commit"),
  deployer: required(args, "deployer"),
  registryAdmin: required(args, "registry-admin"),
  deployedAt: new Date().toISOString(),
  assets: {
    classification: "MOCK",
    officialCoinbaseAssets: false,
    mockB20PolicyAsset: mockRun ? contractDeployment(mockRun, "MockB20PolicyAsset") : null,
  },
  kynloAssetRegistry: contractDeployment(productionRun, "KynloAssetRegistry"),
  kynloVault: contractDeployment(productionRun, "KynloVault"),
  sourceVerified: args["source-verified"] === "true",
};

const outputPath = resolve(args.output ?? "deployments/base-sepolia.json");
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, { mode: 0o644 });
console.log(`Recorded Base Sepolia deployment at ${outputPath}`);
