"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState } from "react";
import { KynloMark } from "./canonical";
import { useKynloAccountConfiguration } from "./kynlo-account-provider";
import "./account-access.css";

const short = (value: string) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "PENDING";

function AccountAccessConfigured() {
  const { ready, authenticated, user, login, logout, linkEmail, linkWallet } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const [mode, setMode] = useState<"email" | "wallet">("email");
  const verifiedEmail = user?.email?.address ?? "";
  const primaryWallet = wallets.find((wallet) => wallet.walletClientType === "privy") ?? wallets[0];

  if (!ready || !walletsReady) {
    return <section className="account-access account-unconfigured" id="account" aria-busy="true">
      <div className="account-index"><span>ACCOUNT / LOADING</span><KynloMark /></div>
      <div className="account-access-copy"><p className="eyebrow">KYNLO ACCOUNT</p><h2>Opening your secure account access.</h2></div>
    </section>;
  }

  if (authenticated && verifiedEmail) {
    return <section className="account-access account-ready" id="account" aria-label="Kynlo account">
      <div className="account-index"><span>ACCOUNT / VERIFIED</span><KynloMark /></div>
      <div className="account-ready-main">
        <div><p className="eyebrow">KYNLO ACCOUNT</p><h2>Your identity and ownership stay connected.</h2></div>
        <dl>
          <div><dt>VERIFIED EMAIL</dt><dd>{verifiedEmail}</dd></div>
          <div><dt>PRIMARY WALLET</dt><dd>{short(primaryWallet?.address ?? user?.wallet?.address ?? "")}</dd></div>
          <div><dt>NETWORK</dt><dd>BASE SEPOLIA</dd></div>
        </dl>
      </div>
      <div className="account-ready-actions">
        <p>Email identifies your Kynlo account. Your wallet remains the authority for assets and claims.</p>
        <div className="account-action-group">
          <button type="button" onClick={() => linkWallet({ walletChainType: "ethereum-only" })}>LINK WALLET</button>
          <button type="button" onClick={() => void logout()}>SIGN OUT</button>
        </div>
      </div>
    </section>;
  }

  if (authenticated && !verifiedEmail) {
    return <section className="account-access" id="account" aria-label="Verify Kynlo account email">
      <div className="account-index"><span>ACCOUNT / EMAIL REQUIRED</span><KynloMark /></div>
      <div className="account-access-copy">
        <p className="eyebrow">ONE FINAL STEP</p>
        <h2>Link your verified email.</h2>
        <p>Your wallet is connected. A verified email is required for Kynlo account access and successor notifications. Email never replaces your wallet signature.</p>
      </div>
      <div className="account-entry">
        <div className="wallet-entry"><span>VERIFICATION</span><strong>Connect the email you control.</strong><button type="button" onClick={linkEmail}>VERIFY EMAIL</button></div>
        <p className="account-message" aria-live="polite">Your account remains incomplete until the email code is verified.</p>
      </div>
    </section>;
  }

  return <section className="account-access" id="account" aria-label="Create a Kynlo account">
    <div className="account-index"><span>ACCOUNT / 001</span><KynloMark /></div>
    <div className="account-access-copy">
      <p className="eyebrow">KYNLO ACCOUNT</p>
      <h2>Enter through email<br />or your wallet.</h2>
      <p>Every Kynlo account finishes with a verified email and a wallet. Email accounts receive an embedded wallet. Wallet accounts link an email before they continue.</p>
    </div>
    <div className="account-entry">
      <div className="account-mode" role="tablist" aria-label="Signup method">
        <button type="button" role="tab" aria-selected={mode === "email"} onClick={() => setMode("email")}>EMAIL SIGNUP</button>
        <button type="button" role="tab" aria-selected={mode === "wallet"} onClick={() => setMode("wallet")}>WALLET SIGNUP</button>
      </div>
      {mode === "wallet"
        ? <div className="wallet-entry"><span>EXTERNAL WALLET</span><strong>Connect. Sign. Then verify email.</strong><button type="button" onClick={() => login({ loginMethods: ["wallet"] })}>CONNECT + SIGN</button></div>
        : <div className="wallet-entry"><span>VERIFIED EMAIL</span><strong>Enter your email. Receive your Kynlo wallet.</strong><button type="button" onClick={() => login({ loginMethods: ["email"] })}>CONTINUE WITH EMAIL</button></div>}
      <p className="account-message" aria-live="polite">Choose how you want to enter Kynlo.</p>
    </div>
  </section>;
}

export function AccountAccess() {
  const { configured } = useKynloAccountConfiguration();
  if (!configured) return <section className="account-access account-unconfigured" id="account">
    <div className="account-index"><span>ACCOUNT / SETUP</span><KynloMark /></div>
    <div className="account-access-copy"><p className="eyebrow">KYNLO ACCOUNT</p><h2>Email and wallet access is being connected.</h2><p>The Kynlo Privy App ID is required before live email codes and embedded wallets are enabled.</p></div>
  </section>;
  return <AccountAccessConfigured />;
}
