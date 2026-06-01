import { SignIn } from '@clerk/nextjs';
import '../../styles.css';

export default function SignInPage() {
  return (
    <main className="auth-page">
      <section className="auth-left">
        <div className="auth-content">
          

          <h1>
            Welcome to the<br />
            <span>StudentPay</span><br />
            NZ Provider Portal
          </h1>

          <p>
            Access payment plans, balances, arrears information and reporting
            for your students.
          </p>

          <div className="auth-form-wrap">
            <SignIn
              routing="path"
              path="/sign-in"
              afterSignInUrl="/"
              
              appearance={{
                elements: {
                  rootBox: 'auth-clerk-root',
                  card: 'auth-clerk-card',
                  headerTitle: 'auth-clerk-title',
                  headerSubtitle: 'auth-clerk-subtitle',
                  formButtonPrimary: 'auth-clerk-button',
                  formFieldInput: 'auth-clerk-input',
                  footerActionLink: 'auth-clerk-link',
                },
            }}
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