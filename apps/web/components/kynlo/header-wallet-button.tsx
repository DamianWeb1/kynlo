"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useKynloAccountConfiguration } from "./kynlo-account-provider";

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

function HeaderAccountButton() {
  const { ready, authenticated, user, login, linkEmail } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const wallet = wallets.find((item) => item.walletClientType === "privy") ?? wallets[0];

  const openAccount = () => {
    if (!authenticated) return login({ loginMethods: ["email", "wallet"] });
    if (!user?.email?.address) return linkEmail();
    document.getElementById("account")?.scrollIntoView({ behavior: "smooth" });
  };

  const label = !ready || !walletsReady
    ? "SIGN IN"
    : authenticated && user?.email?.address && wallet
      ? short(wallet.address)
      : authenticated
        ? "VERIFY EMAIL"
        : "EMAIL OR WALLET";

  return <button className="header-wallet" onClick={openAccount}>
    <span className={authenticated && user?.email?.address ? "wallet-live" : ""} />
    {label}
  </button>;
}

export function HeaderWalletButton() {
  const { configured } = useKynloAccountConfiguration();
  if (!configured) return <button className="header-wallet" onClick={() => document.getElementById("account")?.scrollIntoView({ behavior: "smooth" })}><span />EMAIL OR WALLET</button>;
  return <HeaderAccountButton />;
}
