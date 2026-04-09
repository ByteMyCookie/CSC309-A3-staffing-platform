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
  const isRegular = role === 'REGULAR';

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
      {isRegular && <Link to="/position-types" style={styles.link}>Position Types</Link>}
      {isRegular && <Link to="/jobs" style={styles.link}>Jobs</Link>}
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

        if (role === 'ADMIN') {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setAccountInfo({
            email: payload.email,
            role: payload.role,
            id: payload.id,
          });
          return;
        }

        const endpoint =
          role === 'BUSINESS'
            ? 'http://localhost:3000/businesses/me'
            : 'http://localhost:3000/users/me';

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

      {accountInfo.id && <p><strong>ID:</strong> {accountInfo.id}</p>}
      {accountInfo.email && <p><strong>Email:</strong> {accountInfo.email}</p>}

      {accountInfo.first_name && (
        <p><strong>Name:</strong> {accountInfo.first_name} {accountInfo.last_name}</p>
      )}

      {accountInfo.business_name && (
        <p><strong>Business Name:</strong> {accountInfo.business_name}</p>
      )}

      {accountInfo.owner_name && (
        <p><strong>Owner Name:</strong> {accountInfo.owner_name}</p>
      )}

      {accountInfo.phone_number && (
        <p><strong>Phone:</strong> {accountInfo.phone_number}</p>
      )}

      {accountInfo.postal_address && (
        <p><strong>Address:</strong> {accountInfo.postal_address}</p>
      )}

      {typeof accountInfo.activated !== 'undefined' && (
        <p><strong>Activated:</strong> {String(accountInfo.activated)}</p>
      )}

      {typeof accountInfo.verified !== 'undefined' && (
        <p><strong>Verified:</strong> {String(accountInfo.verified)}</p>
      )}

      {typeof accountInfo.suspended !== 'undefined' && (
        <p><strong>Suspended:</strong> {String(accountInfo.suspended)}</p>
      )}

      {typeof accountInfo.available !== 'undefined' && (
        <p><strong>Available:</strong> {String(accountInfo.available)}</p>
      )}

      {accountInfo.biography && (
        <p><strong>Biography:</strong> {accountInfo.biography}</p>
      )}

      {role !== 'ADMIN' && (
        <Link to="/me/edit" style={styles.smallButton}>
          Edit Profile
        </Link>
      )}

      {accountInfo.resume && (
        <p>
          <strong>Resume:</strong>{' '}
          <a href={`http://localhost:3000${accountInfo.resume}`} target="_blank" rel="noreferrer">
            Open Resume
          </a>
        </p>
      )}

      {accountInfo.avatar && (
        <div style={styles.avatarSection}>
          <strong>Avatar:</strong>
          <img
            src={`http://localhost:3000${accountInfo.avatar}`}
            alt="avatar"
            style={styles.avatarImage}
          />
        </div>
      )}
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

      const body = { email };
      if (password.trim()) {
        body.password = password;
      }

      const response = await fetch(`http://localhost:3000/auth/resets/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Activation / password reset failed');
      }

      setMessage(
        password.trim()
          ? 'Password reset completed successfully'
          : 'Account activated successfully'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.card}>
      <h1>Activate / Reset Password</h1>

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

        <label style={styles.label}>
          New Password (optional)
          <input
            type="password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit'}
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

function EditAccountPage() {
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    owner_name: '',
    phone_number: '',
    postal_address: '',
    biography: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [avatarFile, setAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeMessage, setResumeMessage] = useState('');
  const [resumeError, setResumeError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError('');

        const endpoint =
          role === 'BUSINESS'
            ? 'http://localhost:3000/businesses/me'
            : 'http://localhost:3000/users/me';

        const response = await fetch(endpoint, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load profile');
        }

        setForm({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          business_name: data.business_name || '',
          owner_name: data.owner_name || '',
          phone_number: data.phone_number || '',
          postal_address: data.postal_address || '',
          biography: data.biography || '',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [role, token]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAvatarUpload(event) {
    event.preventDefault();

    try {
      setUploadingAvatar(true);
      setUploadError('');
      setUploadMessage('');

      if (!avatarFile) {
        throw new Error('Please choose an image file first');
      }

      const endpoint =
        role === 'BUSINESS'
          ? 'http://localhost:3000/businesses/me/avatar'
          : 'http://localhost:3000/users/me/avatar';

      const formData = new FormData();
      formData.append('file', avatarFile);

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload avatar');
      }

      setUploadMessage('Avatar uploaded successfully');
      setAvatarFile(null);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleResumeUpload(event) {
    event.preventDefault();

    try {
      setUploadingResume(true);
      setResumeError('');
      setResumeMessage('');

      if (!resumeFile) {
        throw new Error('Please choose a PDF file first');
      }

      const formData = new FormData();
      formData.append('file', resumeFile);

      const response = await fetch('http://localhost:3000/users/me/resume', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload resume');
      }

      setResumeMessage('Resume uploaded successfully');
      setResumeFile(null);
    } catch (err) {
      setResumeError(err.message);
    } finally {
      setUploadingResume(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const endpoint =
        role === 'BUSINESS'
          ? 'http://localhost:3000/businesses/me'
          : 'http://localhost:3000/users/me';

      const payload =
        role === 'BUSINESS'
          ? {
              business_name: form.business_name,
              owner_name: form.owner_name,
              phone_number: form.phone_number,
              postal_address: form.postal_address,
              biography: form.biography,
            }
          : {
              first_name: form.first_name,
              last_name: form.last_name,
              phone_number: form.phone_number,
              postal_address: form.postal_address,
              biography: form.biography,
            };

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }

      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (role === 'ADMIN') {
    return (
      <div style={styles.detailCard}>
        <h1>Edit Profile</h1>
        <p>Admin profile editing is not implemented.</p>
      </div>
    );
  }

  if (loading) {
    return <h1>Loading profile...</h1>;
  }

  return (
    <div style={styles.card}>
      <h1>Edit Profile</h1>

      <form style={styles.form} onSubmit={handleSubmit}>
        {role === 'BUSINESS' ? (
          <>
            <label style={styles.label}>
              Business Name
              <input
                name="business_name"
                type="text"
                style={styles.input}
                value={form.business_name}
                onChange={handleChange}
              />
            </label>

            <label style={styles.label}>
              Owner Name
              <input
                name="owner_name"
                type="text"
                style={styles.input}
                value={form.owner_name}
                onChange={handleChange}
              />
            </label>
          </>
        ) : (
          <>
            <label style={styles.label}>
              First Name
              <input
                name="first_name"
                type="text"
                style={styles.input}
                value={form.first_name}
                onChange={handleChange}
              />
            </label>

            <label style={styles.label}>
              Last Name
              <input
                name="last_name"
                type="text"
                style={styles.input}
                value={form.last_name}
                onChange={handleChange}
              />
            </label>
          </>
        )}

        <label style={styles.label}>
          Phone Number
          <input
            name="phone_number"
            type="text"
            style={styles.input}
            value={form.phone_number}
            onChange={handleChange}
          />
        </label>

        <label style={styles.label}>
          Postal Address
          <input
            name="postal_address"
            type="text"
            style={styles.input}
            value={form.postal_address}
            onChange={handleChange}
          />
        </label>

        <label style={styles.label}>
          Biography
          <textarea
            name="biography"
            style={styles.textarea}
            value={form.biography}
            onChange={handleChange}
          />
        </label>

        <div style={styles.uploadBox}>
          <strong>Upload Avatar</strong>

          <input
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
          />

          <button
            type="button"
            style={styles.button}
            onClick={handleAvatarUpload}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? 'Uploading Avatar...' : 'Upload Avatar'}
          </button>

          {uploadMessage && <p style={{ color: 'green' }}>{uploadMessage}</p>}
          {uploadError && <p style={{ color: 'red' }}>{uploadError}</p>}
        </div>

        {role === 'REGULAR' && (
          <div style={styles.uploadBox}>
            <strong>Upload Resume</strong>

            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            />

            <button
              type="button"
              style={styles.button}
              onClick={handleResumeUpload}
              disabled={uploadingResume}
            >
              {uploadingResume ? 'Uploading Resume...' : 'Upload Resume'}
            </button>

            {resumeMessage && <p style={{ color: 'green' }}>{resumeMessage}</p>}
            {resumeError && <p style={{ color: 'red' }}>{resumeError}</p>}
          </div>
        )}

        <button type="submit" style={styles.button} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => navigate('/me')}
        >
          Back to My Account
        </button>

        {message && <p style={{ color: 'green' }}>{message}</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </form>
    </div>
  );
}

function PositionTypesPage() {
  const [positionTypes, setPositionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadPositionTypes() {
      try {
        setLoading(true);
        setError('');

        if (role !== 'REGULAR') {
          throw new Error('Regular user access only');
        }

        const response = await fetch('http://localhost:3000/position-types', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load position types');
        }

        setPositionTypes(data.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPositionTypes();
  }, [token, role]);

  async function handleRequestQualification(positionTypeId) {
    try {
      const response = await fetch(`http://localhost:3000/position-types/${positionTypeId}/qualifications`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request qualification');
      }

      navigate(`/qualifications/${data.id}`);
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return <h1>Loading position types...</h1>;
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
      <h1>Position Types</h1>

      {actionMessage && <p style={{ color: 'green' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      <div style={styles.list}>
        {positionTypes.map((positionType) => (
          <div key={positionType.id} style={styles.listCard}>
            <h2>{positionType.name}</h2>
            <p>{positionType.description}</p>

            <button
              style={styles.button}
              onClick={() => handleRequestQualification(positionType.id)}
            >
              Request Qualification
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function QualificationDetailPage() {
  const { qualificationId } = useParams();
  const token = localStorage.getItem('token');

  const [qualification, setQualification] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [documentFile, setDocumentFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  async function loadQualification() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`http://localhost:3000/qualifications/${qualificationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load qualification');
      }

      setQualification(data);
      setNote(data.note || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadQualification();
  }, [qualificationId]);

  async function handleDocumentUpload(event) {
    event.preventDefault();

    try {
      setUploading(true);
      setUploadMessage('');
      setUploadError('');

      if (!documentFile) {
        throw new Error('Please choose a PDF file first');
      }

      const formData = new FormData();
      formData.append('file', documentFile);

      const response = await fetch(
        `http://localhost:3000/qualifications/${qualificationId}/document`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload qualification document');
      }

      setUploadMessage('Qualification document uploaded successfully');
      setDocumentFile(null);
      loadQualification();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function getNextRegularStatus(currentStatus) {
    if (currentStatus === 'created') return 'submitted';
    if (currentStatus === 'approved' || currentStatus === 'rejected') return 'revised';
    return null;
  }

  async function handleSaveQualification() {
    try {
      setSaving(true);
      setSaveMessage('');
      setSaveError('');

      const nextStatus = getNextRegularStatus(qualification.status);
      const payload = { note };

      if (nextStatus) {
        payload.status = nextStatus;
      }

      const response = await fetch(`http://localhost:3000/qualifications/${qualificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update qualification');
      }

      setSaveMessage(
        nextStatus
          ? `Qualification updated and moved to ${nextStatus}`
          : 'Qualification note updated'
      );

      setQualification(data);
      setNote(data.note || '');
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <h1>Loading qualification...</h1>;
  }

  if (error) {
    return (
      <div style={styles.detailCard}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!qualification) {
    return (
      <div style={styles.detailCard}>
        <h1>Qualification Not Found</h1>
      </div>
    );
  }

  const nextStatus = getNextRegularStatus(qualification.status);

  return (
    <div style={styles.detailCard}>
      <h1>Qualification Detail</h1>

      <p><strong>ID:</strong> {qualification.id}</p>
      <p><strong>Status:</strong> {qualification.status}</p>
      <p><strong>Position Type:</strong> {qualification.position_type?.name}</p>
      <p><strong>Updated At:</strong> {qualification.updatedAt}</p>

      {qualification.document ? (
        <p>
          <strong>Document:</strong>{' '}
          <a
            href={`http://localhost:3000${qualification.document}`}
            target="_blank"
            rel="noreferrer"
          >
            Open Document
          </a>
        </p>
      ) : (
        <p><strong>Document:</strong> None uploaded yet</p>
      )}

      <label style={styles.label}>
        Qualification Note
        <textarea
          style={styles.textarea}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <button
        type="button"
        style={styles.button}
        onClick={handleSaveQualification}
        disabled={saving}
      >
        {saving
          ? 'Saving...'
          : nextStatus
            ? `Save and mark as ${nextStatus}`
            : 'Save Note'}
      </button>

      {saveMessage && <p style={{ color: 'green' }}>{saveMessage}</p>}
      {saveError && <p style={{ color: 'red' }}>{saveError}</p>}

      <div style={styles.uploadBox}>
        <strong>Upload / Replace Qualification Document</strong>

        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
        />

        <button
          type="button"
          style={styles.button}
          onClick={handleDocumentUpload}
          disabled={uploading}
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>

        {uploadMessage && <p style={{ color: 'green' }}>{uploadMessage}</p>}
        {uploadError && <p style={{ color: 'red' }}>{uploadError}</p>}
      </div>
    </div>
  );
}

function RegularJobsPage() {
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();

  const [jobs, setJobs] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [sort, setSort] = useState('start_time');
  const [order, setOrder] = useState('asc');
  const [positionTypeId, setPositionTypeId] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        setError('');

        if (role !== 'REGULAR') {
          throw new Error('Regular user access only');
        }

        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        params.set('sort', sort);
        params.set('order', order);

        if (positionTypeId.trim()) {
          params.set('position_type_id', positionTypeId.trim());
        }

        const response = await fetch(`http://localhost:3000/jobs?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load jobs');
        }

        setJobs(data.results || []);
        setCount(data.count || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, [token, role, page, limit, sort, order, positionTypeId]);

  const totalPages = Math.max(1, Math.ceil(count / limit));

  if (loading) {
    return <h1>Loading jobs...</h1>;
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
      <h1>Jobs</h1>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label style={styles.label}>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={styles.input}>
            <option value="start_time">Start Time</option>
            <option value="updatedAt">Updated</option>
            <option value="salary_min">Salary Min</option>
            <option value="salary_max">Salary Max</option>
          </select>
        </label>

        <label style={styles.label}>
          Order
          <select value={order} onChange={(e) => setOrder(e.target.value)} style={styles.input}>
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>

        <label style={styles.label}>
          Position Type ID
          <input
            type="text"
            value={positionTypeId}
            onChange={(e) => {
              setPage(1);
              setPositionTypeId(e.target.value);
            }}
            style={styles.input}
          />
        </label>
      </div>

      <p><strong>Total Results:</strong> {count}</p>

      <div style={styles.list}>
        {jobs.map((job) => (
          <div key={job.id} style={styles.listCard}>
            <h2>{job.position_type?.name}</h2>
            <p><strong>Business:</strong> {job.business?.business_name}</p>
            <p><strong>Status:</strong> {job.status}</p>
            <p><strong>Salary:</strong> ${job.salary_min} - ${job.salary_max}</p>
            <p><strong>Start:</strong> {job.start_time}</p>
            <p><strong>End:</strong> {job.end_time}</p>
            <Link to={`/jobs/${job.id}`} style={styles.smallButton}>
              View Job
            </Link>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button
          type="button"
          style={styles.button}
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>

        <button
          type="button"
          style={styles.button}
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>


      </div>

      <p style={{ marginTop: '12px' }}>
        Page {page} of {totalPages}
      </p>
    </div>
  );
}

function RegularJobDetailPage() {
  const { jobId } = useParams();
  const token = localStorage.getItem('token');

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  async function loadJob() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`http://localhost:3000/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load job');
      }

      setJob(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJob();
  }, [jobId]);

  async function handleInterest(interested) {
    try {
      setActionMessage('');
      setActionError('');

      const response = await fetch(`http://localhost:3000/jobs/${jobId}/interested`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interested }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update interest');
      }

      setActionMessage(interested ? 'Interest expressed successfully' : 'Interest withdrawn successfully');
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading) {
    return <h1>Loading job...</h1>;
  }

  if (error) {
    return (
      <div style={styles.detailCard}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div style={styles.detailCard}>
        <h1>Job Not Found</h1>
      </div>
    );
  }

  return (
    <div style={styles.detailCard}>
      <h1>{job.position_type?.name}</h1>

      <p><strong>Job ID:</strong> {job.id}</p>
      <p><strong>Status:</strong> {job.status}</p>
      <p><strong>Business:</strong> {job.business?.business_name}</p>
      <p><strong>Salary:</strong> ${job.salary_min} - ${job.salary_max}</p>
      <p><strong>Start:</strong> {job.start_time}</p>
      <p><strong>End:</strong> {job.end_time}</p>
      <p><strong>Note:</strong> {job.note || '(empty)'}</p>

      {typeof job.distance !== 'undefined' && (
        <p><strong>Distance:</strong> {job.distance}</p>
      )}

      {typeof job.eta !== 'undefined' && (
        <p><strong>ETA:</strong> {job.eta}</p>
      )}

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button
          type="button"
          style={styles.button}
          onClick={() => handleInterest(true)}
        >
          Express Interest
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => handleInterest(false)}
        >
          Withdraw Interest
        </button>
      </div>

      {actionMessage && <p style={{ color: 'green', marginTop: '12px' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red', marginTop: '12px' }}>{actionError}</p>}
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
            <Route
              path="/me/edit"
              element={
                <ProtectedRoute authToken={authToken}>
                  <EditAccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/position-types"
              element={
                <ProtectedRoute authToken={authToken}>
                  <PositionTypesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/qualifications/:qualificationId"
              element={
                <ProtectedRoute authToken={authToken}>
                  <QualificationDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute authToken={authToken}>
                  <RegularJobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId"
              element={
                <ProtectedRoute authToken={authToken}>
                  <RegularJobDetailPage />
                </ProtectedRoute>
              }
            />
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
  avatarSection: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  avatarImage: {
    width: '120px',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
  },
  textarea: {
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    minHeight: '120px',
    resize: 'vertical',
  },
  secondaryButton: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#111827',
    backgroundColor: '#e5e7eb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  uploadBox: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
};