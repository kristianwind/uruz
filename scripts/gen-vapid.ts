/**
 * Generate a VAPID key pair for Web Push.
 *
 *   npm run gen:vapid
 *
 * Copy the two lines it prints into `.env.local`. The keys identify this
 * installation to the push services; generate them once and keep them stable —
 * changing them invalidates every existing subscription.
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("✔ VAPID keys generated — put these in .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:din@email.dk`);
console.log("\nKeep the private key secret and never commit it.");
