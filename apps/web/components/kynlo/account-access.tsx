"use client";

import { useCurrentUser, useEvmAddress, useLinkEmail, useSignInWithEmail, useSignInWithSiwe, useSignOut, useVerifyEmailOTP, useVerifySiweSignature } from "@coinbase/cdp-hooks";
import { useState } from "react";
import { KynloMark } from "./canonical";
import { useKynloAccountConfiguration } from "./kynlo-account-provider";
import "./account-access.css";

type Provider = { request(args: { method: string; params?: unknown[] }): Promise<unknown> };
declare global { interface Window { ethereum?: Provider } }

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const short = (value: string) => value ? `${value.slice(0, 6)}…${value.slice(-4)}` : "PENDING";
const cleanError = (error: unknown) => error instanceof Error ? error.message : "Account request failed.";

function AccountAccessConfigured() {
  const { currentUser } = useCurrentUser();
  const { evmAddress } = useEvmAddress();
  const { signInWithEmail } = useSignInWithEmail();
  const { verifyEmailOTP } = useVerifyEmailOTP();
  const { signInWithSiwe } = useSignInWithSiwe();
  const { verifySiweSignature } = useVerifySiweSignature();
  const { linkEmail } = useLinkEmail();
  const { signOut } = useSignOut();
  const [mode, setMode] = useState<"email" | "wallet">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [flowId, setFlowId] = useState("");
  const [flowPurpose, setFlowPurpose] = useState<"signin" | "link">("signin");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("Choose how you want to enter Kynlo.");
  const verifiedEmail = currentUser?.authenticationMethods.email?.email ?? "";

  const startEmail = async () => {
    if (!emailPattern.test(email)) return setMessage("Enter a valid email address.");
    setBusy("email");
    try {
      const result = currentUser ? await linkEmail(email) : await signInWithEmail({ email });
      setFlowId(result.flowId);
      setFlowPurpose(currentUser ? "link" : "signin");
      setMessage(`Enter the six-digit code sent to ${email}.`);
    } catch (error) { setMessage(cleanError(error)); }
    finally { setBusy(""); }
  };

  const verifyEmail = async () => {
    if (!/^\d{6}$/.test(otp)) return setMessage("Enter the six-digit email code.");
    setBusy("verify");
    try {
      await verifyEmailOTP({ flowId, otp });
      setFlowId(""); setOtp("");
      setMessage(flowPurpose === "link" ? "Email verified and linked to your wallet account." : "Kynlo account ready. Your embedded wallet is active.");
    } catch (error) { setMessage(cleanError(error)); }
    finally { setBusy(""); }
  };

  const signInWithWallet = async () => {
    const provider = window.ethereum;
    if (!provider) return setMessage("Install or enable a wallet extension to continue with a wallet.");
    setBusy("wallet");
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const list = Array.isArray(accounts) ? accounts : [];
      const address = typeof list[0] === "string" ? list[0] : "";
      if (!address) throw new Error("No wallet account was returned.");
      const chainHex = await provider.request({ method: "eth_chainId" });
      const chainId = typeof chainHex === "string" ? Number.parseInt(chainHex, 16) : 84532;
      const challenge = await signInWithSiwe({ address: address as `0x${string}`, chainId, domain: window.location.host, uri: window.location.origin, statement: "Sign in to Kynlo. Email verification is required after this step." });
      const signature = await provider.request({ method: "personal_sign", params: [challenge.message, address] });
      if (typeof signature !== "string") throw new Error("The wallet did not return a signature.");
      await verifySiweSignature({ flowId: challenge.flowId, signature: signature as `0x${string}` });
      setMode("email");
      setMessage("Wallet verified. Add your email to finish creating your Kynlo account.");
    } catch (error) { setMessage(cleanError(error)); }
    finally { setBusy(""); }
  };

  if (currentUser && verifiedEmail) {
    return <section className="account-access account-ready" id="account" aria-label="Kynlo account">
      <div className="account-index"><span>ACCOUNT / VERIFIED</span><KynloMark /></div>
      <div className="account-ready-main"><div><p className="eyebrow">KYNLO ACCOUNT</p><h2>Your identity and ownership stay connected.</h2></div><dl><div><dt>VERIFIED EMAIL</dt><dd>{verifiedEmail}</dd></div><div><dt>PRIMARY WALLET</dt><dd>{short(String(evmAddress ?? ""))}</dd></div><div><dt>RECOVERY</dt><dd>EMAIL + DEVICE SECURITY</dd></div></dl></div>
      <div className="account-ready-actions"><p>{message}</p><button type="button" onClick={() => void signOut()}>SIGN OUT</button></div>
    </section>;
  }

  return <section className="account-access" id="account" aria-label="Create a Kynlo account">
    <div className="account-index"><span>ACCOUNT / 001</span><KynloMark /></div>
    <div className="account-access-copy"><p className="eyebrow">KYNLO ACCOUNT</p><h2>Enter through email<br />or your wallet.</h2><p>Every Kynlo account finishes with a verified email and a wallet. Email accounts receive an embedded wallet. Wallet accounts link an email before they continue.</p></div>
    <div className="account-entry">
      {!currentUser && <div className="account-mode" role="tablist" aria-label="Signup method"><button type="button" role="tab" aria-selected={mode === "email"} onClick={() => { setMode("email"); setFlowId(""); }}>EMAIL SIGNUP</button><button type="button" role="tab" aria-selected={mode === "wallet"} onClick={() => { setMode("wallet"); setFlowId(""); }}>WALLET SIGNUP</button></div>}
      {mode === "wallet" && !currentUser ? <div className="wallet-entry"><span>EXTERNAL WALLET</span><strong>Connect. Sign. Then verify email.</strong><button type="button" disabled={Boolean(busy)} onClick={signInWithWallet}>{busy === "wallet" ? "WAITING FOR WALLET…" : "CONNECT + SIGN"}</button></div> : <div className="email-entry"><label>{currentUser ? "REQUIRED ACCOUNT EMAIL" : "EMAIL ADDRESS"}<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" disabled={Boolean(flowId)} /></label>{flowId ? <label>VERIFICATION CODE<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} placeholder="000000" /></label> : null}<button type="button" disabled={Boolean(busy)} onClick={flowId ? verifyEmail : startEmail}>{busy ? "VERIFYING…" : flowId ? "VERIFY EMAIL" : currentUser ? "SEND VERIFICATION CODE" : "CONTINUE WITH EMAIL"}</button></div>}
      <p className="account-message" aria-live="polite">{message}</p>
    </div>
  </section>;
}

export function AccountAccess() {
  const { configured } = useKynloAccountConfiguration();
  if (!configured) return <section className="account-access account-unconfigured" id="account"><div className="account-index"><span>ACCOUNT / SETUP</span><KynloMark /></div><div className="account-access-copy"><p className="eyebrow">KYNLO ACCOUNT</p><h2>Email and wallet access is being connected.</h2><p>The account layer requires the Kynlo Coinbase CDP project configuration before live email codes and embedded wallets are enabled.</p></div></section>;
  return <AccountAccessConfigured />;
}
