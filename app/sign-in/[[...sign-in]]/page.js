import Image from 'next/image';
import { SignIn } from '@clerk/nextjs';
import '../../styles.css';

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-left">
        <div className="auth-content">
          <div className="auth-brand">
            <Image
              src="/brand/studentpay-nz-logo.jpg"
              alt="StudentPay NZ"
              width={58}
              height={44}
              className="auth-logo"
              priority
            />
            <span className="auth-brand-copy">
              <span className="auth-brand-kicker">StudentPay NZ</span>
              <span className="auth-brand-product">Provider Portal</span>
            </span>
          </div>

          <h1>
            Welcome to the
            <br />
            <span>StudentPay NZ</span>
            <br />
            Provider Portal
          </h1>

          <p>
            Access payment plans, balances, arrears information and reporting
            for your students.
          </p>

          <div className="auth-form-wrap">
            <SignIn
              routing="path"
              path="/sign-in"
              forceRedirectUrl="/"
            />
          </div>
        </div>
      </section>

      <section className="auth-right">
        <div className="auth-image-overlay">
          <h3>Smart payments. Stronger futures.</h3>
          <p>Technology that powers education and supports every journey.</p>
        </div>
      </section>
    </main>
  );
}
