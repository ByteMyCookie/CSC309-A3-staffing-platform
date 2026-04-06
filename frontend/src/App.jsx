import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

function getRoleFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch {
    return null;
  }
}

function Navbar({ authToken, onLogout }) {
  const isLoggedIn = Boolean(authToken);
  const role = authToken ? getRoleFromToken() : null;
  const isAdmin = role === 'ADMIN';

  function handleLogout() {
    localStorage.removeItem('token');
    onLogout();
    window.location.href = '/';
  }

  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.link}>Home</Link>
      <Link to="/login" style={styles.link}>Login</Link>
      <Link to="/register/user" style={styles.link}>Register User</Link>
      <Link to="/register/business" style={styles.link}>Register Business</Link>
      <Link to="/businesses" style={styles.link}>Businesses</Link>
      {isAdmin && <Link to="/admin/businesses" style={styles.link}>Admin Businesses</Link>}
      {isLoggedIn && <Link to="/me" style={styles.link}>My Account</Link>}
      <Link to="/activate" style={styles.link}>Activate</Link>
      <Link to="/forgot-password" style={styles.link}>Forgot Password</Link>

      {isLoggedIn && (
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      )}
    </nav>
  );
}

function HomePage() {
  return (
    <div>
      <h1>Staffing Platform</h1>
      <p>This will be your A3 frontend.</p>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await fetch('http://localhost:3000/auth/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('token', data.token);
      onLogin(data.token);
      setMessage('Login successful');
      console.log('Login response:', data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h1>Login</h1>

      <form style={styles.form} onSubmit={handleSubmit}>
        <label style={styles.label}>
          Email
          <input
            type="email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            type="password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        {message && <p>{message}</p>}
        {localStorage.getItem('token') && (
          <p style={{ color: 'green' }}>Token saved in localStorage</p>
        )}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}

function RegisterUserPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');
      setSuccessData(null);

      const response = await fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccessData(data);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h1>Register User</h1>

      <form style={styles.form} onSubmit={handleSubmit}>
        <label style={styles.label}>
          First Name
          <input
            type="text"
            style={styles.input}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>

        <label style={styles.label}>
          Last Name
          <input
            type="text"
            style={styles.input}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>

        <label style={styles.label}>
          Email
          <input
            type="email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            type="password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Registering...' : 'Register User'}
        </button>

        {error && <p style={{ color: 'red', marginTop: '8px' }}>{error}</p>}

        {successData && (
          <div style={styles.successBox}>
            <p><strong>Account created.</strong></p>
            <p><strong>Email:</strong> {successData.email}</p>
            <p><strong>Activated:</strong> {String(successData.activated)}</p>
            <p><strong>Reset Token:</strong> {successData.resetToken}</p>
            <p><strong>Expires At:</strong> {successData.expiresAt}</p>

            <Link
              to={`/activate?email=${encodeURIComponent(successData.email)}&token=${encodeURIComponent(successData.resetToken)}`}
              style={styles.smallButton}
            >
              Activate This Account
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}

function RegisterBusinessPage() {
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');
      setSuccessData(null);

      const response = await fetch('http://localhost:3000/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_name: businessName,
          owner_name: ownerName,
          email,
          password,
          phone_number: '416-000-0000',
          postal_address: 'Toronto, ON',
          location: {
            lon: -79.3832,
            lat: 43.6532,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Business registration failed');
      }

      setSuccessData(data);
      setBusinessName('');
      setOwnerName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h1>Register Business</h1>

      <form style={styles.form} onSubmit={handleSubmit}>
        <label style={styles.label}>
          Business Name
          <input
            type="text"
            style={styles.input}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </label>

        <label style={styles.label}>
          Owner Name
          <input
            type="text"
            style={styles.input}
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
        </label>

        <label style={styles.label}>
          Email
          <input
            type="email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label style={styles.label}>
          Password
          <input
            type="password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Registering...' : 'Register Business'}
        </button>

        {error && <p style={{ color: 'red', marginTop: '8px' }}>{error}</p>}

        {successData && (
          <div style={styles.successBox}>
            <p><strong>Business created.</strong></p>
            <p><strong>Email:</strong> {successData.email}</p>
            <p><strong>Activated:</strong> {String(successData.activated)}</p>
            <p><strong>Verified:</strong> {String(successData.verified)}</p>
            <p><strong>Reset Token:</strong> {successData.resetToken}</p>
            <p><strong>Expires At:</strong> {successData.expiresAt}</p>

            <Link
              to={`/activate?email=${encodeURIComponent(successData.email)}&token=${encodeURIComponent(successData.resetToken)}`}
              style={styles.smallButton}
            >
              Activate This Account
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}

function BusinessListPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadBusinesses() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('http://localhost:3000/businesses');
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load businesses');
        }

        setBusinesses(data.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBusinesses();
  }, []);

  if (loading) {
    return <h1>Loading businesses...</h1>;
  }

  if (error) {
    return <h1>Error: {error}</h1>;
  }

  return (
    <div>
      <h1>Businesses</h1>
      <div style={styles.list}>
        {businesses.map((business) => (
          <div key={business.id} style={styles.listCard}>
            <h2>{business.business_name}</h2>
            <p><strong>Email:</strong> {business.email}</p>
            <p><strong>Phone:</strong> {business.phone_number}</p>
            <p><strong>Address:</strong> {business.postal_address}</p>
            <Link to={`/businesses/${business.id}`} style={styles.smallButton}>
              View Business
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function BusinessDetailPage() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();
  const isAdmin = role === 'ADMIN';

  async function loadBusiness() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`http://localhost:3000/businesses/${businessId}`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load business');
      }

      setBusiness(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBusiness();
  }, [businessId]);

  async function handleVerifyBusiness() {
    try {
      setActionMessage('');
      setActionError('');

      const response = await fetch(`http://localhost:3000/businesses/${businessId}/verified`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ verified: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify business');
      }

      setActionMessage('Business verified successfully');
      loadBusiness();
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading) {
    return <h1>Loading business...</h1>;
  }

  if (error) {
    return (
      <div style={styles.detailCard}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!business) {
    return (
      <div style={styles.detailCard}>
        <h1>Business Not Found</h1>
      </div>
    );
  }

  return (
    <div style={styles.detailCard}>
      <h1>{business.business_name}</h1>
      <p><strong>Business ID:</strong> {business.id}</p>
      <p><strong>Email:</strong> {business.email}</p>
      {business.owner_name && <p><strong>Owner Name:</strong> {business.owner_name}</p>}
      {typeof business.activated !== 'undefined' && (
        <p><strong>Activated:</strong> {String(business.activated)}</p>
      )}
      {typeof business.verified !== 'undefined' && (
        <p><strong>Verified:</strong> {String(business.verified)}</p>
      )}
      <p><strong>Phone:</strong> {business.phone_number}</p>
      <p><strong>Address:</strong> {business.postal_address}</p>
      <p><strong>Biography:</strong> {business.biography || 'No biography available.'}</p>

      {isAdmin && (
        <button style={styles.button} onClick={handleVerifyBusiness}>
          Verify Business
        </button>
      )}

      {actionMessage && <p style={{ color: 'green', marginTop: '12px' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red', marginTop: '12px' }}>{actionError}</p>}
    </div>
  );
}

function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();

  useEffect(() => {
    async function loadBusinesses() {
      try {
        setLoading(true);
        setError('');

        if (role !== 'ADMIN') {
          throw new Error('Admin access only');
        }

        const response = await fetch('http://localhost:3000/businesses', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load businesses');
        }

        setBusinesses(data.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBusinesses();
  }, [token, role]);

  if (loading) {
    return <h1>Loading admin businesses...</h1>;
  }

  if (error) {
    return (
      <div style={styles.detailCard}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Admin Businesses</h1>
      <div style={styles.list}>
        {businesses.map((business) => (
          <div key={business.id} style={styles.listCard}>
            <h2>{business.business_name}</h2>
            <p><strong>Email:</strong> {business.email}</p>
            {business.owner_name && <p><strong>Owner Name:</strong> {business.owner_name}</p>}
            <p><strong>Activated:</strong> {String(business.activated)}</p>
            <p><strong>Verified:</strong> {String(business.verified)}</p>
            <Link to={`/businesses/${business.id}`} style={styles.smallButton}>
              View Business
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminRoute({ children, authToken }) {
  if (!authToken) {
    return <Navigate to="/login" replace />;
  }

  const role = getRoleFromToken();
  if (role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return children;
}

function MyAccountPage() {
  const [accountInfo, setAccountInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();

  useEffect(() => {
    async function loadAccount() {
      try {
        setLoading(true);
        setError('');

        if (!token) {
          throw new Error('You must be logged in');
        }

        let endpoint = '';
        if (role === 'ADMIN') {
          endpoint = 'http://localhost:3000/admins/me';
        } else if (role === 'BUSINESS') {
          endpoint = 'http://localhost:3000/businesses/me';
        } else {
          endpoint = 'http://localhost:3000/users/me';
        }

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load account');
        }

        setAccountInfo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAccount();
  }, [token, role]);

  if (loading) {
    return <h1>Loading account...</h1>;
  }

  if (error) {
    return (
      <div style={styles.detailCard}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!accountInfo) {
    return (
      <div style={styles.detailCard}>
        <h1>No account data</h1>
      </div>
    );
  }

  return (
    <div style={styles.detailCard}>
      <h1>My Account</h1>
      <p><strong>Role:</strong> {role}</p>
      <pre style={styles.preBox}>{JSON.stringify(accountInfo, null, 2)}</pre>
    </div>
  );
}

function ProtectedRoute({ children, authToken }) {
  if (!authToken) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function ActivateAccountPage() {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');
      setMessage('');

      const response = await fetch(`http://localhost:3000/auth/resets/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Activation failed');
      }

      setMessage('Account activated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h1>Activate Account</h1>

      <form style={styles.form} onSubmit={handleSubmit}>
        <label style={styles.label}>
          Email
          <input
            type="email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label style={styles.label}>
          Reset Token
          <input
            type="text"
            style={styles.input}
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </label>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Activating...' : 'Activate'}
        </button>

        {message && <p style={{ color: 'green', marginTop: '12px' }}>{message}</p>}
        {error && <p style={{ color: 'red', marginTop: '12px' }}>{error}</p>}
      </form>
    </div>
  );
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');
      setSuccessData(null);

      const response = await fetch('http://localhost:3000/auth/resets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Reset request failed');
      }

      setSuccessData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h1>Forgot Password</h1>

      <form style={styles.form} onSubmit={handleSubmit}>
        <label style={styles.label}>
          Email
          <input
            type="email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Requesting...' : 'Request Reset Token'}
        </button>

        {error && <p style={{ color: 'red', marginTop: '12px' }}>{error}</p>}

        {successData && (
          <div style={styles.successBox}>
            <p><strong>Reset token created.</strong></p>
            <p><strong>Expires At:</strong> {successData.expiresAt}</p>
            <p><strong>Reset Token:</strong> {successData.resetToken}</p>

            <Link
              to={`/activate?email=${encodeURIComponent(email)}&token=${encodeURIComponent(successData.resetToken)}`}
              style={styles.smallButton}
            >
              Continue to Reset / Activate
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}

export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('token'));
  return (
    <BrowserRouter>
      <div style={styles.page}>
        <Navbar authToken={authToken} onLogout={() => setAuthToken(null)} />
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage onLogin={setAuthToken} />} />
            <Route path="/register/user" element={<RegisterUserPage />} />
            <Route path="/register/business" element={<RegisterBusinessPage />} />
            <Route path="/businesses" element={<BusinessListPage />} />
            <Route path="/businesses/:businessId" element={<BusinessDetailPage />} />
            <Route
              path="/admin/businesses"
              element={
                <AdminRoute authToken={authToken}>
                  <AdminBusinessesPage />
                </AdminRoute>
              }
            />
            <Route
              path="/me"
              element={
                <ProtectedRoute authToken={authToken}>
                  <MyAccountPage />
                </ProtectedRoute>
              }
            />
            <Route path="/activate" element={<ActivateAccountPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif',
    backgroundColor: '#ffffff',
  },
  nav: {
    display: 'flex',
    gap: '16px',
    padding: '16px 24px',
    backgroundColor: '#132032',
  },
  link: {
    color: 'white',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  main: {
    padding: '24px',
  },
  card: {
    maxWidth: '420px',
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontWeight: 'bold',
  },
  input: {
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '6px',
  },
  button: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#1f2937',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginTop: '16px',
    maxWidth: '800px',
  },
  listCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  smallButton: {
    display: 'inline-block',
    marginTop: '12px',
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#1f2937',
    textDecoration: 'none',
    borderRadius: '6px',
  },
  detailCard: {
    maxWidth: '800px',
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  },
  successBox: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#ecfdf5',
    border: '1px solid #10b981',
    borderRadius: '6px',
  },
  logoutButton: {
    marginLeft: 'auto',
    padding: '8px 14px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  preBox: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};