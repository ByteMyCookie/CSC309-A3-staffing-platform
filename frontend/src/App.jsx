import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, Navigate, useNavigate, useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

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
      {isRegular && <Link to="/position-types" style={styles.link}>Position Types</Link>}
      {isRegular && <Link to="/jobs" style={styles.link}>Jobs</Link>}
      {isRegular && <Link to="/qualifications" style={styles.link}>My Qualifications</Link>}
      {isAdmin && <Link to="/admin/qualifications" style={styles.link}>Admin Qualifications</Link>}
      {isAdmin && <Link to="/admin/users" style={styles.link}>Admin Users</Link>}
      {isAdmin && <Link to="/admin/position-types" style={styles.link}>Admin Position Types</Link>}
      {role === 'BUSINESS' && <Link to="/business/jobs" style={styles.link}>My Jobs</Link>}

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

      const response = await fetch(`${API_BASE}/auth/tokens`, {
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

      const response = await fetch(`${API_BASE}/users`, {
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

      const response = await fetch(`${API_BASE}/businesses`, {
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

        const response = await fetch(`${API_BASE}/businesses`);
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

      const response = await fetch(`${API_BASE}/businesses/${businessId}`, {
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

      const response = await fetch(`${API_BASE}/businesses/${businessId}/verified`, {
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
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const [search, setSearch] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [activatedFilter, setActivatedFilter] = useState('');
  const [page, setPage] = useState(1);

  const token = localStorage.getItem('token');
  const role = getRoleFromToken();
  const pageSize = 5;

  useEffect(() => {
    async function loadBusinesses() {
      try {
        setLoading(true);
        setError('');

        if (role !== 'ADMIN') {
          throw new Error('Admin access only');
        }

        const response = await fetch(`${API_BASE}/businesses`, {
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

  useEffect(() => {
    setPage(1);
  }, [search, verifiedFilter, activatedFilter]);

  async function handleSetVerified(businessId, verified) {
    try {
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/businesses/${businessId}/verified`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ verified }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update verification');
      }

      setBusinesses((prev) =>
        prev.map((business) =>
          business.id === businessId ? { ...business, verified } : business
        )
      );

      setActionMessage(
        verified ? 'Business verified successfully' : 'Business unverified successfully'
      );
    } catch (err) {
      setActionError(err.message);
    }
  }

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch =
      business.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      business.email?.toLowerCase().includes(search.toLowerCase()) ||
      business.owner_name?.toLowerCase().includes(search.toLowerCase());

    const matchesVerified =
      verifiedFilter === ''
        ? true
        : String(business.verified) === verifiedFilter;

    const matchesActivated =
      activatedFilter === ''
        ? true
        : String(business.activated) === activatedFilter;

    return matchesSearch && matchesVerified && matchesActivated;
  });

  const sortedBusinesses = [...filteredBusinesses].sort((a, b) =>
    (a.business_name || '').localeCompare(b.business_name || '')
  );

  const totalPages = Math.max(1, Math.ceil(sortedBusinesses.length / pageSize));
  const visibleBusinesses = sortedBusinesses.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

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

      {actionMessage && <p style={{ color: 'green' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label style={styles.label}>
          Search
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
            placeholder="Business name, email, or owner"
          />
        </label>

        <label style={styles.label}>
          Verified
          <select
            value={verifiedFilter}
            onChange={(e) => setVerifiedFilter(e.target.value)}
            style={styles.input}
          >
            <option value="">All</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
        </label>

        <label style={styles.label}>
          Activated
          <select
            value={activatedFilter}
            onChange={(e) => setActivatedFilter(e.target.value)}
            style={styles.input}
          >
            <option value="">All</option>
            <option value="true">Activated</option>
            <option value="false">Not Activated</option>
          </select>
        </label>
      </div>

      <p><strong>Total Results:</strong> {sortedBusinesses.length}</p>

      {visibleBusinesses.length === 0 ? (
        <p>No businesses found.</p>
      ) : (
        <div style={styles.list}>
          {visibleBusinesses.map((business) => (
            <div key={business.id} style={styles.listCard}>
              <h2>{business.business_name}</h2>
              <p><strong>Email:</strong> {business.email}</p>
              {business.owner_name && <p><strong>Owner Name:</strong> {business.owner_name}</p>}
              <p><strong>Activated:</strong> {String(business.activated)}</p>
              <p><strong>Verified:</strong> {String(business.verified)}</p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                <Link to={`/businesses/${business.id}`} style={styles.smallButton}>
                  View Business
                </Link>

                {business.verified ? (
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => handleSetVerified(business.id, false)}
                  >
                    Unverify
                  </button>
                ) : (
                  <button
                    type="button"
                    style={styles.button}
                    onClick={() => handleSetVerified(business.id, true)}
                  >
                    Verify
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
            ? `${API_BASE}/businesses/me`
            : `${API_BASE}/users/me`;

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
          <a href={`${API_BASE}${accountInfo.resume}`} target="_blank" rel="noreferrer">
            Open Resume
          </a>
        </p>
      )}

      {accountInfo.avatar && (
        <div style={styles.avatarSection}>
          <strong>Avatar:</strong>
          <img
            src={`${API_BASE}${accountInfo.avatar}`}
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

      const response = await fetch(`${API_BASE}/auth/resets/${token}`, {
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

      const response = await fetch(`${API_BASE}/auth/resets`, {
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
            ? `${API_BASE}/businesses/me`
            : `${API_BASE}/users/me`;

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
          ? `${API_BASE}/businesses/me/avatar`
          : `${API_BASE}/users/me/avatar`;

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

      const response = await fetch(`${API_BASE}/users/me/resume`, {
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
          ? `${API_BASE}/businesses/me`
          : `${API_BASE}/users/me`;

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

        const response = await fetch(`${API_BASE}/position-types`, {
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
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/qualifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          position_type_id: positionTypeId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request qualification');
      }

      navigate(`/qualifications/${data.id}`);
    } catch (err) {
      setActionError(err.message);
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

      const response = await fetch(`${API_BASE}/qualifications/${qualificationId}`, {
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
        `${API_BASE}/qualifications/${qualificationId}/document`,
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

      const response = await fetch(`${API_BASE}/qualifications/${qualificationId}`, {
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
            href={`${API_BASE}${qualification.document}`}
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

        const response = await fetch(`${API_BASE}/jobs?${params.toString()}`, {
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

      const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
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

      const response = await fetch(`${API_BASE}/jobs/${jobId}/interested`, {
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

function MyQualificationsPage() {
  const token = localStorage.getItem('token');

  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    async function loadQualifications() {
      try {
        setLoading(true);
        setError('');

        const response = await fetch(`${API_BASE}/qualifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load qualifications');
        }

        setQualifications(data.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadQualifications();
  }, [token]);

  const filteredQualifications = qualifications.filter((qualification) => {
    if (!statusFilter) return true;
    return qualification.status === statusFilter;
  });

  const sortedQualifications = [...filteredQualifications].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.updated_at || 0).getTime();
    const bTime = new Date(b.updatedAt || b.updated_at || 0).getTime();

    return sortOrder === 'desc' ? bTime - aTime : aTime - bTime;
  });

  const totalPages = Math.max(1, Math.ceil(sortedQualifications.length / pageSize));
  const startIndex = (page - 1) * pageSize;
  const visibleQualifications = sortedQualifications.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sortOrder]);

  if (loading) {
    return <h1>Loading qualifications...</h1>;
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
      <h1>My Qualifications</h1>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label style={styles.label}>
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.input}
          >
            <option value="">All</option>
            <option value="created">created</option>
            <option value="submitted">submitted</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="revised">revised</option>
          </select>
        </label>

        <label style={styles.label}>
          Sort by Updated
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={styles.input}
          >
            <option value="desc">Newest First</option>
            <option value="asc">Oldest First</option>
          </select>
        </label>
      </div>

      {sortedQualifications.length === 0 ? (
        <p>No qualifications found.</p>
      ) : (
        <>
          <div style={styles.list}>
            {visibleQualifications.map((qualification) => (
              <div key={qualification.id} style={styles.listCard}>
                <h2>{qualification.position_type?.name || 'Unknown Position Type'}</h2>
                <p><strong>Status:</strong> {qualification.status}</p>
                <p><strong>Updated:</strong> {qualification.updatedAt || qualification.updated_at}</p>

                {qualification.note && (
                  <p><strong>Note:</strong> {qualification.note}</p>
                )}

                <Link
                  to={`/qualifications/${qualification.id}`}
                  style={styles.smallButton}
                >
                  View Qualification
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
        </>
      )}
    </div>
  );
}

function AdminQualificationsPage() {
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();

  const [qualifications, setQualifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const pageSize = 5;

  useEffect(() => {
    async function loadQualifications() {
      try {
        setLoading(true);
        setError('');

        if (role !== 'ADMIN') {
          throw new Error('Admin access only');
        }

        const response = await fetch(`${API_BASE}/qualifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load qualifications');
        }

        setQualifications(data.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadQualifications();
  }, [token, role]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  async function handleSetStatus(qualificationId, status) {
    try {
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/qualifications/${qualificationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update qualification status');
      }

      setQualifications((prev) =>
        prev.map((qualification) =>
          qualification.id === qualificationId ? data : qualification
        )
      );

      setActionMessage(`Qualification marked as ${status}`);
    } catch (err) {
      setActionError(err.message);
    }
  }

  const filteredQualifications = qualifications.filter((qualification) => {
    const userName = `${qualification.user?.first_name || ''} ${qualification.user?.last_name || ''}`.toLowerCase();
    const positionTypeName = qualification.position_type?.name?.toLowerCase() || '';
    const note = qualification.note?.toLowerCase() || '';
    const searchText = search.toLowerCase();

    const matchesSearch =
      userName.includes(searchText) ||
      positionTypeName.includes(searchText) ||
      note.includes(searchText) ||
      String(qualification.id).includes(searchText);

    const matchesStatus =
      statusFilter === '' ? true : qualification.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedQualifications = [...filteredQualifications].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.updated_at || 0).getTime();
    const bTime = new Date(b.updatedAt || b.updated_at || 0).getTime();
    return bTime - aTime;
  });

  const totalPages = Math.max(1, Math.ceil(sortedQualifications.length / pageSize));
  const visibleQualifications = sortedQualifications.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  if (loading) {
    return <h1>Loading admin qualifications...</h1>;
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
      <h1>Admin Qualifications</h1>

      {actionMessage && <p style={{ color: 'green' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label style={styles.label}>
          Search
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
            placeholder="User, position type, note, or id"
          />
        </label>

        <label style={styles.label}>
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.input}
          >
            <option value="">All</option>
            <option value="created">created</option>
            <option value="submitted">submitted</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="revised">revised</option>
          </select>
        </label>
      </div>

      <p><strong>Total Results:</strong> {sortedQualifications.length}</p>

      {visibleQualifications.length === 0 ? (
        <p>No qualifications found.</p>
      ) : (
        <div style={styles.list}>
          {visibleQualifications.map((qualification) => (
            <div key={qualification.id} style={styles.listCard}>
              <h2>{qualification.position_type?.name || 'Unknown Position Type'}</h2>
              <p>
                <strong>User:</strong>{' '}
                {qualification.user?.first_name} {qualification.user?.last_name}
              </p>
              <p><strong>Qualification ID:</strong> {qualification.id}</p>
              <p><strong>Status:</strong> {qualification.status}</p>
              <p><strong>Updated:</strong> {qualification.updatedAt || qualification.updated_at}</p>

              {qualification.note && (
                <p><strong>Note:</strong> {qualification.note}</p>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                <Link
                  to={`/qualifications/${qualification.id}`}
                  style={styles.smallButton}
                >
                  View Qualification
                </Link>

                <button
                  type="button"
                  style={styles.button}
                  onClick={() => handleSetStatus(qualification.id, 'approved')}
                >
                  Approve
                </button>

                <button
                  type="button"
                  style={styles.secondaryButton}
                  onClick={() => handleSetStatus(qualification.id, 'rejected')}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

function AdminUsersPage() {
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const [search, setSearch] = useState('');
  const [suspendedFilter, setSuspendedFilter] = useState('');
  const [page, setPage] = useState(1);

  const pageSize = 5;

  useEffect(() => {
    async function loadUsers() {
      try {
        setLoading(true);
        setError('');

        if (role !== 'ADMIN') {
          throw new Error('Admin access only');
        }

        const response = await fetch(`${API_BASE}/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load users');
        }

        setUsers(data.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [token, role]);

  useEffect(() => {
    setPage(1);
  }, [search, suspendedFilter]);

  async function handleSetSuspended(userId, suspended) {
    try {
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/users/${userId}/suspended`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ suspended }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update suspension');
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, suspended } : user
        )
      );

      setActionMessage(
        suspended ? 'User suspended successfully' : 'User unsuspended successfully'
      );
    } catch (err) {
      setActionError(err.message);
    }
  }

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    const searchText = search.toLowerCase();

    const matchesSearch =
      fullName.includes(searchText) ||
      email.includes(searchText) ||
      String(user.id).includes(searchText);

    const matchesSuspended =
      suspendedFilter === ''
        ? true
        : String(user.suspended) === suspendedFilter;

    return matchesSearch && matchesSuspended;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim();
    const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim();
    return aName.localeCompare(bName);
  });

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const visibleUsers = sortedUsers.slice((page - 1) * pageSize, page * pageSize);

  if (loading) {
    return <h1>Loading admin users...</h1>;
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
      <h1>Admin Users</h1>

      {actionMessage && <p style={{ color: 'green' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label style={styles.label}>
          Search
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
            placeholder="Name, email, or id"
          />
        </label>

        <label style={styles.label}>
          Suspended
          <select
            value={suspendedFilter}
            onChange={(e) => setSuspendedFilter(e.target.value)}
            style={styles.input}
          >
            <option value="">All</option>
            <option value="true">Suspended</option>
            <option value="false">Active</option>
          </select>
        </label>
      </div>

      <p><strong>Total Results:</strong> {sortedUsers.length}</p>

      {visibleUsers.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <div style={styles.list}>
          {visibleUsers.map((user) => (
            <div key={user.id} style={styles.listCard}>
              <h2>
                {user.first_name} {user.last_name}
              </h2>
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Activated:</strong> {String(user.activated)}</p>
              <p><strong>Suspended:</strong> {String(user.suspended)}</p>

              {typeof user.available !== 'undefined' && (
                <p><strong>Available:</strong> {String(user.available)}</p>
              )}

              {user.biography && (
                <p><strong>Biography:</strong> {user.biography}</p>
              )}

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                {user.suspended ? (
                  <button
                    type="button"
                    style={styles.button}
                    onClick={() => handleSetSuspended(user.id, false)}
                  >
                    Unsuspend
                  </button>
                ) : (
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => handleSetSuspended(user.id, true)}
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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

function AdminPositionTypesPage() {
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();

  const [positionTypes, setPositionTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const [search, setSearch] = useState('');
  const [hiddenFilter, setHiddenFilter] = useState('');
  const [page, setPage] = useState(1);

  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const pageSize = 5;

  useEffect(() => {
    async function loadPositionTypes() {
      try {
        setLoading(true);
        setError('');

        if (role !== 'ADMIN') {
          throw new Error('Admin access only');
        }

        const response = await fetch(`${API_BASE}/position-types`, {
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

  useEffect(() => {
    setPage(1);
  }, [search, hiddenFilter]);

  async function handleCreatePositionType(event) {
    event.preventDefault();

    try {
      setCreating(true);
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/position-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: createName,
          description: createDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create position type');
      }

      setPositionTypes((prev) => [data, ...prev]);
      setCreateName('');
      setCreateDescription('');
      setActionMessage('Position type created successfully');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(positionType) {
    setEditingId(positionType.id);
    setEditName(positionType.name || '');
    setEditDescription(positionType.description || '');
    setActionMessage('');
    setActionError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditDescription('');
  }

  async function handleSaveEdit(positionTypeId) {
    try {
      setSavingEdit(true);
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/position-types/${positionTypeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update position type');
      }

      setPositionTypes((prev) =>
        prev.map((positionType) =>
          positionType.id === positionTypeId ? data : positionType
        )
      );

      setEditingId(null);
      setEditName('');
      setEditDescription('');
      setActionMessage('Position type updated successfully');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSetHidden(positionTypeId, hidden) {
    try {
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/position-types/${positionTypeId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hidden }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update hidden status');
      }

      setPositionTypes((prev) =>
        prev.map((positionType) =>
          positionType.id === positionTypeId ? data : positionType
        )
      );

      setActionMessage(
        hidden
          ? 'Position type hidden successfully'
          : 'Position type unhidden successfully'
      );
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleDelete(positionTypeId) {
    try {
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/position-types/${positionTypeId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete position type');
      }

      setPositionTypes((prev) =>
        prev.filter((positionType) => positionType.id !== positionTypeId)
      );

      setActionMessage('Position type deleted successfully');
    } catch (err) {
      setActionError(err.message);
    }
  }

  const filteredPositionTypes = positionTypes.filter((positionType) => {
    const matchesSearch =
      (positionType.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (positionType.description || '').toLowerCase().includes(search.toLowerCase()) ||
      String(positionType.id).includes(search.toLowerCase());

    const matchesHidden =
      hiddenFilter === ''
        ? true
        : String(positionType.hidden) === hiddenFilter;

    return matchesSearch && matchesHidden;
  });

  const sortedPositionTypes = [...filteredPositionTypes].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  );

  const totalPages = Math.max(1, Math.ceil(sortedPositionTypes.length / pageSize));
  const visiblePositionTypes = sortedPositionTypes.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  if (loading) {
    return <h1>Loading admin position types...</h1>;
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
      <h1>Admin Position Types</h1>

      {actionMessage && <p style={{ color: 'green' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      <form
        onSubmit={handleCreatePositionType}
        style={{
          ...styles.detailCard,
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h2>Create Position Type</h2>

        <label style={styles.label}>
          Name
          <input
            type="text"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            style={styles.input}
            required
          />
        </label>

        <label style={styles.label}>
          Description
          <textarea
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            style={styles.textarea}
            required
          />
        </label>

        <button type="submit" style={styles.button} disabled={creating}>
          {creating ? 'Creating...' : 'Create Position Type'}
        </button>
      </form>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label style={styles.label}>
          Search
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
            placeholder="Name, description, or id"
          />
        </label>

        <label style={styles.label}>
          Hidden
          <select
            value={hiddenFilter}
            onChange={(e) => setHiddenFilter(e.target.value)}
            style={styles.input}
          >
            <option value="">All</option>
            <option value="true">Hidden</option>
            <option value="false">Visible</option>
          </select>
        </label>
      </div>

      <p><strong>Total Results:</strong> {sortedPositionTypes.length}</p>

      {visiblePositionTypes.length === 0 ? (
        <p>No position types found.</p>
      ) : (
        <div style={styles.list}>
          {visiblePositionTypes.map((positionType) => (
            <div key={positionType.id} style={styles.listCard}>
              {editingId === positionType.id ? (
                <>
                  <h2>Editing Position Type #{positionType.id}</h2>

                  <label style={styles.label}>
                    Name
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={styles.input}
                    />
                  </label>

                  <label style={styles.label}>
                    Description
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      style={styles.textarea}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <button
                      type="button"
                      style={styles.button}
                      onClick={() => handleSaveEdit(positionType.id)}
                      disabled={savingEdit}
                    >
                      {savingEdit ? 'Saving...' : 'Save'}
                    </button>

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2>{positionType.name}</h2>
                  <p><strong>Position Type ID:</strong> {positionType.id}</p>
                  <p><strong>Description:</strong> {positionType.description}</p>
                  <p><strong>Hidden:</strong> {String(positionType.hidden)}</p>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                    <button
                      type="button"
                      style={styles.button}
                      onClick={() => startEdit(positionType)}
                    >
                      Edit
                    </button>

                    {positionType.hidden ? (
                      <button
                        type="button"
                        style={styles.button}
                        onClick={() => handleSetHidden(positionType.id, false)}
                      >
                        Unhide
                      </button>
                    ) : (
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => handleSetHidden(positionType.id, true)}
                      >
                        Hide
                      </button>
                    )}

                    <button
                      type="button"
                      style={styles.secondaryButton}
                      onClick={() => handleDelete(positionType.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

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

function BusinessJobsPage() {
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();

  const [jobs, setJobs] = useState([]);
  const [positionTypes, setPositionTypes] = useState([]);
  const [businessProfile, setBusinessProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    position_type_id: '',
    salary_min: '',
    salary_max: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    note: '',
  });

  const pageSize = 5;
  const JOB_START_WINDOW_DAYS = 7;

  function formatLocalDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function combineDateAndTime(dateValue, timeValue) {
    if (!dateValue || !timeValue) {
      return '';
    }

    const normalizedTime = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
    return `${dateValue}T${normalizedTime}`;
  }

  const now = new Date();
  const minStartDate = formatLocalDateInput(now);
  const maxStartDateObj = new Date(now.getTime() + JOB_START_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const maxStartDate = formatLocalDateInput(maxStartDateObj);

  useEffect(() => {
    async function loadPageData() {
      try {
        setLoading(true);
        setError('');

        if (role !== 'BUSINESS') {
          throw new Error('Business access only');
        }

        const [businessRes, jobsRes, positionTypesRes] = await Promise.all([
          fetch(`${API_BASE}/businesses/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/businesses/me/jobs`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/position-types`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const businessData = await businessRes.json();
        const jobsData = await jobsRes.json();
        const positionTypesData = await positionTypesRes.json();

        if (!businessRes.ok) {
          throw new Error(businessData.error || 'Failed to load business profile');
        }

        if (!jobsRes.ok) {
          throw new Error(jobsData.error || 'Failed to load business jobs');
        }

        if (!positionTypesRes.ok) {
          throw new Error(positionTypesData.error || 'Failed to load position types');
        }

        setBusinessProfile(businessData);
        setJobs(jobsData.results || []);
        setPositionTypes(positionTypesData.results || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPageData();
  }, [token, role]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  function handleCreateChange(event) {
    const { name, value } = event.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateJob(event) {
    event.preventDefault();

    try {
      setCreating(true);
      setActionMessage('');
      setActionError('');

      if (!businessProfile?.verified) {
        throw new Error('Only verified businesses can create job postings');
      }

      const start_time = combineDateAndTime(createForm.start_date, createForm.start_time);
      const end_time = combineDateAndTime(createForm.end_date, createForm.end_time);

      if (!start_time || !end_time) {
        throw new Error('Start date/time and end date/time are required');
      }

      const startDateTime = new Date(start_time);
      const endDateTime = new Date(end_time);
      const latestAllowedStart = new Date(Date.now() + JOB_START_WINDOW_DAYS * 24 * 60 * 60 * 1000);

      if (Number.isNaN(startDateTime.getTime())) {
        throw new Error('start_time must be a valid datetime');
      }

      if (Number.isNaN(endDateTime.getTime())) {
        throw new Error('end_time must be a valid datetime');
      }

      if (endDateTime.getTime() <= startDateTime.getTime()) {
        throw new Error('end_time must be after start_time');
      }

      if (startDateTime.getTime() > latestAllowedStart.getTime()) {
        throw new Error(`start_time must be within the next ${JOB_START_WINDOW_DAYS} days`);
      }

      const response = await fetch(`${API_BASE}/businesses/me/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          position_type_id: Number(createForm.position_type_id),
          salary_min: Number(createForm.salary_min),
          salary_max: Number(createForm.salary_max),
          start_time,
          end_time,
          note: createForm.note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create job');
      }

      setJobs((prev) => [data, ...prev]);
      setCreateForm({
        position_type_id: '',
        salary_min: '',
        salary_max: '',
        start_date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        note: '',
      });
      setActionMessage('Job created successfully');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const filteredJobs = jobs.filter((job) => {
    const positionTypeName = job.position_type?.name?.toLowerCase() || '';
    const workerName = `${job.worker?.first_name || ''} ${job.worker?.last_name || ''}`.toLowerCase();
    const note = (job.note || '').toLowerCase();
    const searchText = search.toLowerCase();

    const matchesSearch =
      positionTypeName.includes(searchText) ||
      workerName.includes(searchText) ||
      note.includes(searchText) ||
      String(job.id).includes(searchText);

    const matchesStatus =
      statusFilter === '' ? true : job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const aTime = new Date(a.start_time || 0).getTime();
    const bTime = new Date(b.start_time || 0).getTime();
    return bTime - aTime;
  });

  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / pageSize));
  const visibleJobs = sortedJobs.slice((page - 1) * pageSize, page * pageSize);

  if (loading) {
    return <h1>Loading business jobs...</h1>;
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
      <h1>My Business Jobs</h1>

      {businessProfile && (
        <p>
          <strong>Verified Business:</strong> {String(businessProfile.verified)}
        </p>
      )}

      {actionMessage && <p style={{ color: 'green' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      <form
        onSubmit={handleCreateJob}
        style={{
          ...styles.detailCard,
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <h2>Create Job Posting</h2>

        {!businessProfile?.verified && (
          <p style={{ color: 'red' }}>
            This business must be verified before creating job postings.
          </p>
        )}

        <p style={{ margin: 0 }}>
          Start time must be within the next {JOB_START_WINDOW_DAYS} days.
        </p>

        <label style={styles.label}>
          Position Type
          <select
            name="position_type_id"
            value={createForm.position_type_id}
            onChange={handleCreateChange}
            style={styles.input}
            required
            disabled={!businessProfile?.verified}
          >
            <option value="">Select a position type</option>
            {positionTypes
              .filter((positionType) => !positionType.hidden)
              .map((positionType) => (
                <option key={positionType.id} value={positionType.id}>
                  {positionType.name}
                </option>
              ))}
          </select>
        </label>

        <label style={styles.label}>
          Salary Min
          <input
            name="salary_min"
            type="number"
            value={createForm.salary_min}
            onChange={handleCreateChange}
            style={styles.input}
            required
            disabled={!businessProfile?.verified}
          />
        </label>

        <label style={styles.label}>
          Salary Max
          <input
            name="salary_max"
            type="number"
            value={createForm.salary_max}
            onChange={handleCreateChange}
            style={styles.input}
            required
            disabled={!businessProfile?.verified}
          />
        </label>

        <label style={styles.label}>
          Start Date
          <input
            name="start_date"
            type="date"
            value={createForm.start_date}
            onChange={handleCreateChange}
            style={styles.input}
            min={minStartDate}
            max={maxStartDate}
            required
            disabled={!businessProfile?.verified}
          />
        </label>

        <label style={styles.label}>
          Start Time
          <input
            name="start_time"
            type="time"
            step="60"
            value={createForm.start_time}
            onChange={handleCreateChange}
            style={styles.input}
            required
            disabled={!businessProfile?.verified}
          />
        </label>

        <label style={styles.label}>
          End Date
          <input
            name="end_date"
            type="date"
            value={createForm.end_date}
            onChange={handleCreateChange}
            style={styles.input}
            min={createForm.start_date || minStartDate}
            required
            disabled={!businessProfile?.verified}
          />
        </label>

        <label style={styles.label}>
          End Time
          <input
            name="end_time"
            type="time"
            step="60"
            value={createForm.end_time}
            onChange={handleCreateChange}
            style={styles.input}
            required
            disabled={!businessProfile?.verified}
          />
        </label>

        <label style={styles.label}>
          Note
          <textarea
            name="note"
            value={createForm.note}
            onChange={handleCreateChange}
            style={styles.textarea}
            disabled={!businessProfile?.verified}
          />
        </label>

        <button
          type="submit"
          style={styles.button}
          disabled={creating || !businessProfile?.verified}
        >
          {creating ? 'Creating...' : 'Create Job'}
        </button>
      </form>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label style={styles.label}>
          Search
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
            placeholder="Position type, worker, note, or id"
          />
        </label>

        <label style={styles.label}>
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.input}
          >
            <option value="">All</option>
            <option value="open">open</option>
            <option value="filled">filled</option>
            <option value="expired">expired</option>
            <option value="cancelled">cancelled</option>
            <option value="completed">completed</option>
          </select>
        </label>
      </div>

      <p><strong>Total Results:</strong> {sortedJobs.length}</p>

      {visibleJobs.length === 0 ? (
        <p>No jobs found.</p>
      ) : (
        <div style={styles.list}>
          {visibleJobs.map((job) => (
            <div key={job.id} style={styles.listCard}>
              <h2>{job.position_type?.name || 'Unknown Position Type'}</h2>
              <p><strong>Job ID:</strong> {job.id}</p>
              <p><strong>Status:</strong> {job.status}</p>
              <p><strong>Salary:</strong> ${job.salary_min} - ${job.salary_max}</p>
              <p><strong>Start:</strong> {job.start_time}</p>
              <p><strong>End:</strong> {job.end_time}</p>

              {job.worker ? (
                <p>
                  <strong>Worker:</strong> {job.worker.first_name} {job.worker.last_name}
                </p>
              ) : (
                <p><strong>Worker:</strong> None assigned</p>
              )}

              {job.note && (
                <p><strong>Note:</strong> {job.note}</p>
              )}

              <Link to={`/business/jobs/${job.id}`} style={styles.smallButton}>
                View Job
              </Link>
            </div>
          ))}
        </div>
      )}

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

function BusinessJobDetailPage() {
  const { jobId } = useParams();
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const [job, setJob] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    salary_min: '',
    salary_max: '',
    start_date: '',
    start_time: '',
    end_date: '',
    end_time: '',
    note: '',
  });

  const JOB_START_WINDOW_DAYS = 7;

  function formatLocalDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function splitDateTime(value) {
    if (!value || typeof value !== 'string' || value.length < 16) {
      return { date: '', time: '' };
    }

    return {
      date: value.slice(0, 10),
      time: value.slice(11, 16),
    };
  }

  function combineDateAndTime(dateValue, timeValue) {
    if (!dateValue || !timeValue) {
      return '';
    }

    const normalizedTime = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
    return `${dateValue}T${normalizedTime}`;
  }

  const now = new Date();
  const minStartDate = formatLocalDateInput(now);
  const maxStartDateObj = new Date(now.getTime() + JOB_START_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const maxStartDate = formatLocalDateInput(maxStartDateObj);

  async function loadJobPage() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load job');
      }

      setJob(data);

      const startParts = splitDateTime(data.start_time);
      const endParts = splitDateTime(data.end_time);

      setForm({
        salary_min: String(data.salary_min ?? ''),
        salary_max: String(data.salary_max ?? ''),
        start_date: startParts.date,
        start_time: startParts.time,
        end_date: endParts.date,
        end_time: endParts.time,
        note: data.note || '',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobPage();
  }, [jobId]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setActionMessage('');
      setActionError('');

      const start_time = combineDateAndTime(form.start_date, form.start_time);
      const end_time = combineDateAndTime(form.end_date, form.end_time);

      if (!start_time || !end_time) {
        throw new Error('Start date/time and end date/time are required');
      }

      const startDateTime = new Date(start_time);
      const endDateTime = new Date(end_time);
      const latestAllowedStart = new Date(Date.now() + JOB_START_WINDOW_DAYS * 24 * 60 * 60 * 1000);

      if (Number.isNaN(startDateTime.getTime())) {
        throw new Error('start_time must be a valid datetime');
      }

      if (Number.isNaN(endDateTime.getTime())) {
        throw new Error('end_time must be a valid datetime');
      }

      if (endDateTime.getTime() <= startDateTime.getTime()) {
        throw new Error('end_time must be after start_time');
      }

      if (startDateTime.getTime() > latestAllowedStart.getTime()) {
        throw new Error(`start_time must be within the next ${JOB_START_WINDOW_DAYS} days`);
      }

      const response = await fetch(`${API_BASE}/businesses/me/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          salary_min: Number(form.salary_min),
          salary_max: Number(form.salary_max),
          start_time,
          end_time,
          note: form.note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update job');
      }

      await loadJobPage();
      setEditing(false);
      setActionMessage('Job updated successfully');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      setDeleting(true);
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/businesses/me/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete job');
      }

      navigate('/business/jobs');
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <h1>Loading business job...</h1>;
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

  const isEditable = job.status === 'open';

  return (
    <div style={styles.detailCard}>
      <h1>Business Job Detail</h1>

      {actionMessage && <p style={{ color: 'green' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      {editing ? (
        <>
          <p><strong>Position Type:</strong> {job.position_type?.name}</p>

          <label style={styles.label}>
            Salary Min
            <input
              name="salary_min"
              type="number"
              value={form.salary_min}
              onChange={handleChange}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Salary Max
            <input
              name="salary_max"
              type="number"
              value={form.salary_max}
              onChange={handleChange}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Start Date
            <input
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={handleChange}
              style={styles.input}
              min={minStartDate}
              max={maxStartDate}
            />
          </label>

          <label style={styles.label}>
            Start Time
            <input
              name="start_time"
              type="time"
              step="60"
              value={form.start_time}
              onChange={handleChange}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            End Date
            <input
              name="end_date"
              type="date"
              value={form.end_date}
              onChange={handleChange}
              style={styles.input}
              min={form.start_date || minStartDate}
            />
          </label>

          <label style={styles.label}>
            End Time
            <input
              name="end_time"
              type="time"
              step="60"
              value={form.end_time}
              onChange={handleChange}
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Note
            <textarea
              name="note"
              value={form.note}
              onChange={handleChange}
              style={styles.textarea}
            />
          </label>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
            <button
              type="button"
              style={styles.button}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p><strong>Job ID:</strong> {job.id}</p>
          <p><strong>Position Type:</strong> {job.position_type?.name}</p>
          <p><strong>Status:</strong> {job.status}</p>
          <p><strong>Salary:</strong> ${job.salary_min} - ${job.salary_max}</p>
          <p><strong>Start:</strong> {job.start_time}</p>
          <p><strong>End:</strong> {job.end_time}</p>

          {job.worker ? (
            <p>
              <strong>Worker:</strong> {job.worker.first_name} {job.worker.last_name}
            </p>
          ) : (
            <p><strong>Worker:</strong> None assigned</p>
          )}

          <p><strong>Note:</strong> {job.note || '(empty)'}</p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
            <button
              type="button"
              style={styles.button}
              onClick={() => setEditing(true)}
              disabled={!isEditable}
            >
              Edit
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={handleDelete}
              disabled={!isEditable || deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => navigate('/business/jobs')}
            >
              Back to My Jobs
            </button>
          </div>

          {!isEditable && (
            <p style={{ marginTop: '12px' }}>
              This job can only be edited or deleted while its status is open.
            </p>
          )}
        </>
      )}
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
            <Route
              path="/qualifications"
              element={
                <ProtectedRoute authToken={authToken}>
                  <MyQualificationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/qualifications"
              element={
                <AdminRoute authToken={authToken}>
                  <AdminQualificationsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AdminRoute authToken={authToken}>
                  <AdminUsersPage />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/position-types"
              element={
                <AdminRoute authToken={authToken}>
                  <AdminPositionTypesPage />
                </AdminRoute>
              }
            />
            <Route
              path="/business/jobs"
              element={
                <ProtectedRoute authToken={authToken}>
                  <BusinessJobsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/jobs/:jobId"
              element={
                <ProtectedRoute authToken={authToken}>
                  <BusinessJobDetailPage />
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