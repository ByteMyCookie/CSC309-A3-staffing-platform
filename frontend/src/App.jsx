import { useEffect, useRef, useState } from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useParams,
  Navigate,
  useNavigate,
  useSearchParams,
  useLocation,
} from 'react-router-dom';

import { io } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

function formatDateTime(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function getStatusBadgeStyle(value) {
  const status = normalizeStatus(value);

  const base = {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'capitalize',
    border: '1px solid transparent',
  };

  if (['approved', 'success', 'verified', 'active', 'open', 'available', 'mutual'].includes(status)) {
    return {
      ...base,
      background: '#dcfce7',
      color: '#166534',
      borderColor: '#86efac',
    };
  }

  if (['pending', 'submitted', 'revised'].includes(status)) {
    return {
      ...base,
      background: '#fef3c7',
      color: '#92400e',
      borderColor: '#fcd34d',
    };
  }

  if (['rejected', 'failed', 'declined', 'canceled', 'cancelled', 'expired', 'suspended', 'filled', 'completed', 'hidden'].includes(status)) {
    return {
      ...base,
      background: '#fee2e2',
      color: '#991b1b',
      borderColor: '#fca5a5',
    };
  }

  return {
    ...base,
    background: '#e5e7eb',
    color: '#374151',
    borderColor: '#d1d5db',
  };
}

function StatusBadge({ value }) {
  return <span style={getStatusBadgeStyle(value)}>{String(value || 'unknown')}</span>;
}

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

function NavDropdown({ label, children }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} style={styles.dropdown}>
      <button
        type="button"
        style={styles.navMenuButton}
        onClick={() => setOpen((prev) => !prev)}
      >
        {label}
      </button>

      {open && (
        <div style={styles.dropdownMenu}>
          {children}
        </div>
      )}
    </div>
  );
}

function Navbar({ authToken, onLogout }) {
  const isLoggedIn = Boolean(authToken);
  const role = authToken ? getRoleFromToken() : null;

  const isAdmin = role === 'ADMIN';
  const isRegular = role === 'REGULAR';
  const isBusiness = role === 'BUSINESS';

  function handleLogout() {
    localStorage.removeItem('token');
    onLogout();
    window.location.href = '/';
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.navLeft}>
        <Link to="/" style={styles.link}>
          Home
        </Link>

        <NavDropdown label="Public">
          <Link to="/businesses" style={styles.navMenuLink}>Businesses</Link>
          <Link to="/login" style={styles.navMenuLink}>Login</Link>
          <Link to="/register/user" style={styles.navMenuLink}>Register User</Link>
          <Link to="/register/business" style={styles.navMenuLink}>Register Business</Link>
        </NavDropdown>

        {isRegular && (
          <NavDropdown label="Regular">
            <Link to="/me" style={styles.navMenuLink}>My Account</Link>
            <Link to="/jobs" style={styles.navMenuLink}>Jobs</Link>
            <Link to="/qualifications" style={styles.navMenuLink}>Qualifications</Link>
            <Link to="/my-interests" style={styles.navMenuLink}>Interests</Link>
            <Link to="/my-invitations" style={styles.navMenuLink}>Invitations</Link>
            <Link to="/negotiation" style={styles.navMenuLink}>Negotiation</Link>
          </NavDropdown>
        )}

        {isBusiness && (
          <NavDropdown label="Business">
            <Link to="/me" style={styles.navMenuLink}>My Account</Link>
            <Link to="/business/jobs" style={styles.navMenuLink}>My Jobs</Link>
            <Link to="/negotiation" style={styles.navMenuLink}>Negotiation</Link>
          </NavDropdown>
        )}

        {isAdmin && (
          <NavDropdown label="Admin">
            <Link to="/admin/users" style={styles.navMenuLink}>Users</Link>
            <Link to="/admin/businesses" style={styles.navMenuLink}>Businesses</Link>
            <Link to="/admin/qualifications" style={styles.navMenuLink}>Qualifications</Link>
            <Link to="/admin/position-types" style={styles.navMenuLink}>Position Types</Link>
            <Link to="/admin/system" style={styles.navMenuLink}>System</Link>
          </NavDropdown>
        )}
      </div>

      <div style={styles.navRight}>
        {isLoggedIn && (
          <>
            <Link to="/me" style={styles.link}>
              Account
            </Link>
            <button onClick={handleLogout} style={styles.logoutButton}>
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function HomePage() {
  return (
    <div>
      <div style={styles.detailCard}>
        <h1>Temporary Staffing Platform</h1>
        <p>
          Find qualified short-term staff, manage job postings, review qualifications,
          and handle time-sensitive negotiations between regular users and businesses.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
          <Link to="/login" style={styles.button}>Login</Link>
          <Link to="/register/user" style={styles.secondaryButton}>Register as User</Link>
          <Link to="/register/business" style={styles.secondaryButton}>Register as Business</Link>
          <Link to="/businesses" style={styles.secondaryButton}>Browse Businesses</Link>
        </div>
      </div>

      <div style={styles.detailCard}>
        <h2>Demo Accounts for Grading</h2>
        <p>
          These seeded accounts make it easy to test major workflows quickly.
        </p>

        <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
          <div style={styles.listCard}>
            <h3>Administrator</h3>
            <p><strong>Email:</strong> admin1@csc309.utoronto.ca</p>
            <p><strong>Password:</strong> 123123</p>
            <p>Use this account to verify businesses, review qualifications, manage users, position types, and system settings.</p>
          </div>

          <div style={styles.listCard}>
            <h3>Business</h3>
            <p><strong>Email:</strong> business1@csc309.utoronto.ca</p>
            <p><strong>Password:</strong> 123123</p>
            <p>Use this account to review candidates, manage jobs, track interests, and test negotiation flows.</p>
          </div>

          <div style={styles.listCard}>
            <h3>Regular User</h3>
            <p><strong>Email:</strong> regular2@csc309.utoronto.ca</p>
            <p><strong>Password:</strong> 123123</p>
            <p>Use this account to test job browsing, interests, invitations, and the seeded active negotiation with business1.</p>
          </div>
        </div>
      </div>

      <div style={styles.detailCard}>
        <h2>Recommended Grader Path</h2>
        <ol style={{ paddingLeft: '20px', lineHeight: 1.8 }}>
          <li>Log in as admin to review qualifications, businesses, users, position types, and system settings.</li>
          <li>Log in as business1 to inspect jobs, candidate discovery, interests, and negotiation actions.</li>
          <li>Log in as regular2 to inspect jobs, qualifications, invitations, interests, and the active negotiation page.</li>
          <li>Open the negotiation page on both business1 and regular2 to test live chat, countdown, and accept or decline flow.</li>
        </ol>
      </div>

      <div style={styles.detailCard}>
        <h2>For Regular Users</h2>
        <p>
          Build a profile, upload documents, request qualifications, browse matching jobs,
          and manage invitations and negotiations.
        </p>
        <ul>
          <li>Request and revise qualifications</li>
          <li>Browse jobs you qualify for</li>
          <li>Track invitations and interests</li>
          <li>Respond to negotiation decisions</li>
        </ul>
      </div>

      <div style={styles.detailCard}>
        <h2>For Businesses</h2>
        <p>
          Create job postings, review candidates, invite users, track interests,
          and manage negotiations for open roles.
        </p>
        <ul>
          <li>Create and manage jobs</li>
          <li>Review discoverable candidates</li>
          <li>Invite qualified users</li>
          <li>Start and monitor negotiations</li>
        </ul>
      </div>

      <div style={styles.detailCard}>
        <h2>For Administrators</h2>
        <p>
          Moderate platform activity by reviewing users, businesses, qualifications,
          position types, and system-wide settings.
        </p>
        <ul>
          <li>Approve or reject qualifications</li>
          <li>Verify businesses</li>
          <li>Suspend users</li>
          <li>Adjust platform configuration</li>
        </ul>
      </div>

      <div style={styles.detailCard}>
        <h2>Platform Status Visibility</h2>
        <p>
          The interface is designed to make system state visible, including qualification
          status, job status, invitations, mutual interest, and active negotiation windows.
        </p>
      </div>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const navigate = useNavigate();
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

      const role = JSON.parse(atob(data.token.split('.')[1])).role;
      if (role === 'ADMIN') {
        navigate('/admin/businesses');
      } else if (role === 'BUSINESS') {
        navigate('/business/jobs');
      } else {
        navigate('/me');
      }
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
            <p><strong>Expires At:</strong> {formatDateTime(successData.expiresAt)}</p>

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
            <p><strong>Expires At:</strong> {formatDateTime(successData.expiresAt)}</p>

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
        <p>
          <strong>Activated:</strong>{' '}
          <StatusBadge value={business.activated ? 'active' : 'inactive'} />
        </p>
      )}
      {typeof business.verified !== 'undefined' && (
        <p>
          <strong>Verified:</strong>{' '}
          <StatusBadge value={business.verified ? 'verified' : 'unverified'} />
        </p>
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

  const pageSize = 5;
  const token = localStorage.getItem('token');

  useEffect(() => {
    async function loadBusinesses() {
      try {
        setLoading(true);
        setError('');

        const role = getRoleFromToken();
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
  }, [token]);

  // Reset to first page when filters change
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

      // Update state locally
      setBusinesses((prev) =>
        prev.map((b) => (b.id === businessId ? { ...b, verified } : b))
      );

      setActionMessage(
        verified ? 'Business verified successfully' : 'Business unverified successfully'
      );
    } catch (err) {
      setActionError(err.message);
    }
  }

  const filteredBusinesses = businesses.filter((business) => {
    const term = search.toLowerCase();
    
    // Robust search: handle nulls by defaulting to empty strings
    const matchesSearch =
      (business.business_name || '').toLowerCase().includes(term) ||
      (business.email || '').toLowerCase().includes(term) ||
      (business.owner_name || '').toLowerCase().includes(term);

    const matchesVerified =
      verifiedFilter === '' ? true : String(business.verified) === verifiedFilter;

    const matchesActivated =
      activatedFilter === '' ? true : String(business.activated) === activatedFilter;

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

  if (loading) return <h1>Loading admin businesses...</h1>;

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

      {actionMessage && <p style={{ color: 'green', fontWeight: 'bold' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red', fontWeight: 'bold' }}>{actionError}</p>}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <label style={styles.label}>
          Search
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
            placeholder="Name, email, or owner"
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
              <h2>{business.business_name || 'Unnamed Business'}</h2>
              <p><strong>Email:</strong> {business.email}</p>
              {business.owner_name && (
                <p><strong>Owner:</strong> {business.owner_name}</p>
              )}
              
              <div style={{ margin: '8px 0' }}>
                <strong>Activated:</strong>{' '}
                <StatusBadge value={business.activated ? 'active' : 'inactive'} />
              </div>
              <div style={{ margin: '8px 0' }}>
                <strong>Verified:</strong>{' '}
                <StatusBadge value={business.verified ? 'verified' : 'unverified'} />
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                <Link to={`/businesses/${business.id}`} style={styles.smallButton}>
                  View Details
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
                    Verify Business
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '20px', alignItems: 'center' }}>
        <button
          type="button"
          style={styles.button}
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>

        <span>Page {page} of {totalPages}</span>

        <button
          type="button"
          style={styles.button}
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
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
        <p>
          <strong>Activated:</strong>{' '}
          <StatusBadge value={accountInfo.activated ? 'active' : 'inactive'} />
        </p>
      )}
      {typeof accountInfo.verified !== 'undefined' && (
        <p>
          <strong>Verified:</strong>{' '}
          <StatusBadge value={accountInfo.verified ? 'verified' : 'unverified'} />
        </p>
      )}
      {typeof accountInfo.suspended !== 'undefined' && (
        <p>
          <strong>Suspended:</strong>{' '}
          <StatusBadge value={accountInfo.suspended ? 'suspended' : 'not suspended'} />
        </p>
      )}
      {typeof accountInfo.available !== 'undefined' && (
        <p>
          <strong>Available:</strong>{' '}
          <StatusBadge value={accountInfo.available ? 'available' : 'unavailable'} />
        </p>
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
            <p><strong>Expires At:</strong> {formatDateTime(successData.expiresAt)}</p>
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
      <p><strong>Status:</strong> <StatusBadge value={qualification.status} /></p>
      <p><strong>Position Type:</strong> {qualification.position_type?.name}</p>
      <p><strong>Updated At:</strong> {formatDateTime(qualification.updatedAt)}</p>

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
            <p><strong>Status:</strong> <StatusBadge value={job.status} /></p>
            <p><strong>Salary:</strong> ${job.salary_min} - ${job.salary_max}</p>
            <p><strong>Start:</strong> {formatDateTime(job.start_time)}</p>
            <p><strong>End:</strong> {formatDateTime(job.end_time)}</p>
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
      <p><strong>Status:</strong> <StatusBadge value={job.status} /></p>
      <p><strong>Business:</strong> {job.business?.business_name}</p>
      <p><strong>Salary:</strong> ${job.salary_min} - ${job.salary_max}</p>
      <p><strong>Start:</strong> {formatDateTime(job.start_time)}</p>
      <p><strong>End:</strong> {formatDateTime(job.end_time)}</p>
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
                <p><strong>Status:</strong> <StatusBadge value={qualification.status} /></p>
                <p><strong>Updated:</strong> {formatDateTime(qualification.updatedAt || qualification.updated_at)}</p>

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
          {visibleQualifications.map((qualification) => {
            const canAdminReview = ['submitted', 'revised'].includes(
              String(qualification.status || '').toLowerCase()
            );

            return (
              <div key={qualification.id} style={styles.listCard}>
                <h2>{qualification.position_type?.name || 'Unknown Position Type'}</h2>
                <p>
                  <strong>User:</strong>{' '}
                  {qualification.user?.first_name} {qualification.user?.last_name}
                </p>
                <p><strong>Qualification ID:</strong> {qualification.id}</p>
                <p><strong>Status:</strong> <StatusBadge value={qualification.status} /></p>
                <p><strong>Updated:</strong> {formatDateTime(qualification.updatedAt || qualification.updated_at)}</p>

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

                  {/* Conditional Action Buttons Replacement */}
                  {canAdminReview ? (
                    <>
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
                    </>
                  ) : (
                    <p style={{ opacity: 0.75, marginTop: '8px', fontSize: '0.9rem' }}>
                      No admin action available for this status.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
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

              <p>
                <strong>Activated:</strong>{' '}
                <StatusBadge value={user.activated ? 'active' : 'inactive'} />
              </p>

              <p><strong>Suspended:</strong> <StatusBadge value={user.suspended ? 'suspended' : 'not suspended'} /></p>

              {typeof user.available !== 'undefined' && (
                <p>
                  <strong>Available:</strong>{' '}
                  <StatusBadge value={user.available ? 'available' : 'unavailable'} />
                </p>
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
                  <p>
                    <strong>Hidden:</strong>{' '}
                    <StatusBadge value={positionType.hidden ? 'hidden' : 'visible'} />
                  </p>

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
              <p><strong>Status:</strong> <StatusBadge value={job.status} /></p>
              <p><strong>Salary:</strong> ${job.salary_min} - ${job.salary_max}</p>
              <p><strong>Start:</strong> {formatDateTime(job.start_time)}</p>
              <p><strong>End:</strong> {formatDateTime(job.end_time)}</p>

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

function BusinessCandidateDetailPage() {
  const { jobId, userId } = useParams();
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const [candidateData, setCandidateData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  async function loadCandidateDetail() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE}/jobs/${jobId}/candidates/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load candidate detail');
      }

      setCandidateData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCandidateDetail();
  }, [jobId, userId]);

  async function handleSetInterested(interested) {
    try {
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/jobs/${jobId}/candidates/${userId}/interested`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interested }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update candidate interest');
      }

      setActionMessage(
        interested ? 'Candidate invited successfully' : 'Invitation withdrawn successfully'
      );
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading) {
    return <h1>Loading candidate detail...</h1>;
  }

  if (error) {
    return (
      <div style={styles.detailCard}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!candidateData) {
    return (
      <div style={styles.detailCard}>
        <h1>Candidate Not Found</h1>
      </div>
    );
  }

  const { user, job } = candidateData;

  return (
    <div style={styles.detailCard}>
      <h1>Candidate Detail</h1>

      {actionMessage && <p style={{ color: 'green' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      <div style={{ marginBottom: '24px' }}>
        <h2>
          {user.first_name} {user.last_name}
        </h2>
        <p><strong>User ID:</strong> {user.id}</p>

        {user.biography && (
          <p><strong>Biography:</strong> {user.biography}</p>
        )}

        {user.avatar && (
          <div style={styles.avatarSection}>
            <strong>Avatar:</strong>
            <img
              src={`${API_BASE}${user.avatar}`}
              alt="candidate avatar"
              style={styles.avatarImage}
            />
          </div>
        )}

        {user.resume ? (
          <p>
            <strong>Resume:</strong>{' '}
            <a href={`${API_BASE}${user.resume}`} target="_blank" rel="noreferrer">
              Open Resume
            </a>
          </p>
        ) : (
          <p><strong>Resume:</strong> None uploaded</p>
        )}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2>Qualification</h2>
        <p><strong>Qualification ID:</strong> {user.qualification?.id}</p>
        <p><strong>Position Type ID:</strong> {user.qualification?.position_type_id}</p>

        {user.qualification?.note ? (
          <p><strong>Qualification Note:</strong> {user.qualification.note}</p>
        ) : (
          <p><strong>Qualification Note:</strong> None</p>
        )}

        {user.qualification?.document ? (
          <p>
            <strong>Qualification Document:</strong>{' '}
            <a
              href={`${API_BASE}${user.qualification.document}`}
              target="_blank"
              rel="noreferrer"
            >
              Open Document
            </a>
          </p>
        ) : (
          <p><strong>Qualification Document:</strong> None uploaded</p>
        )}
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h2>Job Summary</h2>
        <p><strong>Job ID:</strong> {job.id}</p>
        <p><strong>Status:</strong> <StatusBadge value={job.status} /></p>
        <p><strong>Position Type:</strong> {job.position_type?.name}</p>
        <p><strong>Start:</strong> {formatDateTime(job.start_time)}</p>
        <p><strong>End:</strong> {formatDateTime(job.end_time)}</p>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          style={styles.button}
          onClick={() => handleSetInterested(true)}
        >
          Invite Candidate
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => handleSetInterested(false)}
        >
          Withdraw Invite
        </button>

        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => navigate(`/business/jobs/${jobId}/candidates`)}
        >
          Back to Candidates
        </button>
      </div>
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
          <p><strong>Status:</strong> <StatusBadge value={job.status} /></p>
          <p><strong>Salary:</strong> ${job.salary_min} - ${job.salary_max}</p>
          <p><strong>Start:</strong> {formatDateTime(job.start_time)}</p>
          <p><strong>End:</strong> {formatDateTime(job.end_time)}</p>

          {job.worker ? (
            <p>
              <strong>Worker:</strong> {job.worker.first_name} {job.worker.last_name}
            </p>
          ) : (
            <p><strong>Worker:</strong> None assigned</p>
          )}

          <p><strong>Note:</strong> {job.note || '(empty)'}</p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
            <Link to={`/business/jobs/${job.id}/candidates`} style={styles.smallButton}>
              Candidates
            </Link>

            <Link to={`/business/jobs/${job.id}/interests`} style={styles.smallButton}>
              Interests
            </Link>

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

function AdminSystemConfigPage() {
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();

  const [resetCooldown, setResetCooldown] = useState('0');
  const [negotiationWindow, setNegotiationWindow] = useState('900');
  const [jobStartWindow, setJobStartWindow] = useState('168');
  const [availabilityTimeout, setAvailabilityTimeout] = useState('300');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function patchConfig(url, body, successMessage) {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      if (role !== 'ADMIN') {
        throw new Error('Admin access only');
      }

      const response = await fetch(`${API_BASE}${url}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update system setting');
      }

      setMessage(successMessage);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveResetCooldown(event) {
    event.preventDefault();
    await patchConfig(
      '/system/reset-cooldown',
      { reset_cooldown: Number(resetCooldown) },
      'Reset cooldown updated successfully'
    );
  }

  async function handleSaveNegotiationWindow(event) {
    event.preventDefault();
    await patchConfig(
      '/system/negotiation-window',
      { negotiation_window: Number(negotiationWindow) },
      'Negotiation window updated successfully'
    );
  }

  async function handleSaveJobStartWindow(event) {
    event.preventDefault();
    await patchConfig(
      '/system/job-start-window',
      { job_start_window: Number(jobStartWindow) },
      'Job start window updated successfully'
    );
  }

  async function handleSaveAvailabilityTimeout(event) {
    event.preventDefault();
    await patchConfig(
      '/system/availability-timeout',
      { availability_timeout: Number(availabilityTimeout) },
      'Availability timeout updated successfully'
    );
  }

  return (
    <div>
      <h1>Admin System Configuration</h1>

      <p>
        <strong>Units:</strong> reset cooldown in seconds, negotiation window in seconds,
        job start window in hours, availability timeout in seconds.
      </p>

      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={styles.list}>
        <form
          onSubmit={handleSaveResetCooldown}
          style={{
            ...styles.listCard,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h2>Reset Cooldown</h2>
          <label style={styles.label}>
            Seconds
            <input
              type="number"
              min="0"
              value={resetCooldown}
              onChange={(e) => setResetCooldown(e.target.value)}
              style={styles.input}
            />
          </label>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Saving...' : 'Save Reset Cooldown'}
          </button>
        </form>

        <form
          onSubmit={handleSaveNegotiationWindow}
          style={{
            ...styles.listCard,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h2>Negotiation Window</h2>
          <label style={styles.label}>
            Seconds
            <input
              type="number"
              min="1"
              value={negotiationWindow}
              onChange={(e) => setNegotiationWindow(e.target.value)}
              style={styles.input}
            />
          </label>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Saving...' : 'Save Negotiation Window'}
          </button>
        </form>

        <form
          onSubmit={handleSaveJobStartWindow}
          style={{
            ...styles.listCard,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h2>Job Start Window</h2>
          <label style={styles.label}>
            Hours
            <input
              type="number"
              min="1"
              value={jobStartWindow}
              onChange={(e) => setJobStartWindow(e.target.value)}
              style={styles.input}
            />
          </label>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Saving...' : 'Save Job Start Window'}
          </button>
        </form>

        <form
          onSubmit={handleSaveAvailabilityTimeout}
          style={{
            ...styles.listCard,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h2>Availability Timeout</h2>
          <label style={styles.label}>
            Seconds
            <input
              type="number"
              min="1"
              value={availabilityTimeout}
              onChange={(e) => setAvailabilityTimeout(e.target.value)}
              style={styles.input}
            />
          </label>
          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Saving...' : 'Save Availability Timeout'}
          </button>
        </form>
      </div>
    </div>
  );
}

function BusinessJobCandidatesPage() {
  const { jobId } = useParams();
  const token = localStorage.getItem('token');

  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const [page, setPage] = useState(1);
  const pageSize = 5;

  async function loadCandidatesPage(currentPage = page) {
    try {
      setLoading(true);
      setError('');

      const [jobRes, candidatesRes] = await Promise.all([
        fetch(`${API_BASE}/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(
          `${API_BASE}/jobs/${jobId}/candidates?page=${currentPage}&limit=${pageSize}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),
      ]);

      const jobData = await jobRes.json();
      const candidatesData = await candidatesRes.json();

      if (!jobRes.ok) {
        throw new Error(jobData.error || 'Failed to load job');
      }

      if (!candidatesRes.ok) {
        throw new Error(candidatesData.error || 'Failed to load candidates');
      }

      setJob(jobData);
      setCandidates(candidatesData.results || []);
      setCount(candidatesData.count || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCandidatesPage(page);
  }, [jobId, page]);

  async function handleSetInterested(userId, interested) {
    try {
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/jobs/${jobId}/candidates/${userId}/interested`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interested }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update candidate interest');
      }

      setCandidates((prev) =>
        prev.map((candidate) =>
          candidate.id === userId ? { ...candidate, invited: interested } : candidate
        )
      );

      setActionMessage(
        interested ? 'Candidate invited successfully' : 'Invitation withdrawn successfully'
      );
    } catch (err) {
      setActionError(err.message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  if (loading) {
    return <h1>Loading candidates...</h1>;
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
      <h1>Job Candidates</h1>

      {job && (
        <div style={styles.detailCard}>
          <p><strong>Job ID:</strong> {job.id}</p>
          <p><strong>Position Type:</strong> {job.position_type?.name}</p>
          <p><strong>Status:</strong> <StatusBadge value={job.status} /></p>
          <p><strong>Salary:</strong> ${job.salary_min} - ${job.salary_max}</p>
          <p><strong>Start:</strong> {formatDateTime(job.start_time)}</p>
          <p><strong>End:</strong> {formatDateTime(job.end_time)}</p>
        </div>
      )}

      {actionMessage && <p style={{ color: 'green' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      <p><strong>Total Results:</strong> {count}</p>

      {candidates.length === 0 ? (
        <p>No discoverable candidates found.</p>
      ) : (
        <div style={styles.list}>
          {candidates.map((candidate) => (
            <div key={candidate.id} style={styles.listCard}>
              <h2>
                {candidate.first_name} {candidate.last_name}
              </h2>

              <p><strong>User ID:</strong> {candidate.id}</p>
              <p><strong>Invited:</strong> {String(candidate.invited)}</p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                <Link
                  to={`/business/jobs/${jobId}/candidates/${candidate.id}`}
                  style={styles.smallButton}
                >
                  View Candidate
                </Link>

                {candidate.invited ? (
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => handleSetInterested(candidate.id, false)}
                  >
                    Withdraw Invite
                  </button>
                ) : (
                  <button
                    type="button"
                    style={styles.button}
                    onClick={() => handleSetInterested(candidate.id, true)}
                  >
                    Invite Candidate
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

function BusinessJobInterestsPage() {
  const { jobId } = useParams();
  const token = localStorage.getItem('token');

  const [interests, setInterests] = useState([]);
  const [count, setCount] = useState(0);
  const [job, setJob] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const [page, setPage] = useState(1);
  const pageSize = 5;

  async function loadInterestsPage(currentPage = page) {
    try {
      setLoading(true);
      setError('');

      const [jobRes, interestsRes] = await Promise.all([
        fetch(`${API_BASE}/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(
          `${API_BASE}/jobs/${jobId}/interests?page=${currentPage}&limit=${pageSize}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        ),
      ]);

      const jobData = await jobRes.json();
      const interestsData = await interestsRes.json();

      if (!jobRes.ok) {
        throw new Error(jobData.error || 'Failed to load job');
      }

      if (!interestsRes.ok) {
        throw new Error(interestsData.error || 'Failed to load job interests');
      }

      setJob(jobData);
      setInterests(interestsData.results || []);
      setCount(interestsData.count || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInterestsPage(page);
  }, [jobId, page]);

  async function handleStartNegotiation(interestId) {
    try {
      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/negotiations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interest_id: interestId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start negotiation');
      }

      setActionMessage(`Negotiation started successfully (ID: ${data.id})`);
    } catch (err) {
      setActionError(err.message);
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  if (loading) {
    return <h1>Loading job interests...</h1>;
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
      <h1>Job Interests</h1>

      {job && (
        <div style={styles.detailCard}>
          <p><strong>Job ID:</strong> {job.id}</p>
          <p><strong>Position Type:</strong> {job.position_type?.name}</p>
          <p><strong>Status:</strong> <StatusBadge value={job.status} /></p>
          <p><strong>Salary:</strong> ${job.salary_min} - ${job.salary_max}</p>
          <p><strong>Start:</strong> {formatDateTime(job.start_time)}</p>
          <p><strong>End:</strong> {formatDateTime(job.end_time)}</p>
        </div>
      )}

      {actionMessage && <p style={{ color: 'green' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}

      <p><strong>Total Results:</strong> {count}</p>

      {interests.length === 0 ? (
        <p>No user interests found for this job.</p>
      ) : (
        <div style={styles.list}>
          {interests.map((interest) => (
            <div key={interest.interest_id} style={styles.listCard}>
              <h2>
                {interest.user?.first_name} {interest.user?.last_name}
              </h2>

              <p><strong>Interest ID:</strong> {interest.interest_id}</p>
              <p><strong>User ID:</strong> {interest.user?.id}</p>
              <p><strong>Mutual Interest:</strong> {String(interest.mutual)}</p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                <Link
                  to={`/business/jobs/${jobId}/candidates/${interest.user?.id}`}
                  style={styles.smallButton}
                >
                  View Candidate
                </Link>

                <button
                  type="button"
                  style={styles.button}
                  disabled={!interest.mutual}
                  onClick={() => handleStartNegotiation(interest.interest_id)}
                >
                  Start Negotiation
                </button>
              </div>

              {!interest.mutual && (
                <p style={{ marginTop: '12px' }}>
                  Negotiation can only start after mutual interest is reached.
                </p>
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

function MyNegotiationPage() {
  const token = localStorage.getItem('token');
  const role = getRoleFromToken();

  const [negotiation, setNegotiation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [nowMs, setNowMs] = useState(Date.now());

  const [socketState, setSocketState] = useState('disconnected');
  const [socketError, setSocketError] = useState('');
  const [chatText, setChatText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  const socketRef = useRef(null);
  const negotiationIdRef = useRef(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  async function loadNegotiation(showSpinner = true) {
    try {
      if (showSpinner) setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE}/negotiations/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 404) {
        setNegotiation(null);
        return null;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load negotiation');
      }

      setNegotiation(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to load negotiation');
      return null;
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  useEffect(() => {
    if (role !== 'REGULAR' && role !== 'BUSINESS') {
      setLoading(false);
      setError('Negotiation page is only for regular users and businesses');
      return;
    }

    loadNegotiation();
  }, [token, role]);

  useEffect(() => {
    const currentId = negotiation?.id ?? null;

    if (negotiationIdRef.current !== currentId) {
      setChatMessages([]);
    }

    negotiationIdRef.current = currentId;
  }, [negotiation?.id]);

  useEffect(() => {
    if (!token || (role !== 'REGULAR' && role !== 'BUSINESS')) {
      return;
    }

    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;
    setSocketState('connecting');
    setSocketError('');

    socket.on('connect', () => {
      setSocketState('connected');
      setSocketError('');
    });

    socket.on('disconnect', () => {
      setSocketState('disconnected');
    });

    socket.on('connect_error', (err) => {
      setSocketState('error');
      setSocketError(err?.message || 'Socket connection failed');
    });

    socket.on('negotiation:started', async (payload) => {
      setActionMessage(
        payload?.negotiation_id
          ? `Negotiation started: #${payload.negotiation_id}`
          : 'Negotiation started'
      );
      await loadNegotiation(false);
    });

    socket.on('negotiation:message', (payload) => {
      if (!payload || !payload.negotiation_id) return;

      const currentId = negotiationIdRef.current;
      if (currentId && Number(payload.negotiation_id) !== Number(currentId)) {
        return;
      }

      setChatMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.negotiation_id === payload.negotiation_id &&
            m.text === payload.text &&
            m.createdAt === payload.createdAt &&
            m.sender?.id === payload.sender?.id
        );

        if (exists) return prev;

        return [...prev, payload].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });
    });

    socket.on('negotiation:error', (payload) => {
      setSocketError(payload?.message || payload?.error || 'Negotiation socket error');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, role]);

  function formatRemaining(ms) {
    if (ms <= 0) return 'Expired';

    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  async function handleDecision(decision) {
    try {
      if (!negotiation) return;

      setActionMessage('');
      setActionError('');

      const response = await fetch(`${API_BASE}/negotiations/me/decision`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          negotiation_id: negotiation.id,
          decision,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update negotiation decision');
      }

      await loadNegotiation(false);
      setActionMessage(`Decision recorded: ${decision}`);
    } catch (err) {
      setActionError(err.message || 'Failed to update negotiation decision');
    }
  }

  function handleSendMessage(event) {
    event.preventDefault();

    if (!socketRef.current || !negotiation) return;

    const text = chatText.trim();
    if (!text) return;

    socketRef.current.emit('negotiation:message', {
      negotiation_id: negotiation.id,
      text,
    });

    setChatText('');
  }

  if (loading) {
    return <h1>Loading negotiation...</h1>;
  }

  if (error) {
    return (
      <div style={styles.detailCard}>
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  if (!negotiation) {
    return (
      <div style={styles.detailCard}>
        <h1>My Negotiation</h1>
        <p>No active negotiation.</p>
        <p>Socket: {socketState}</p>
        {socketError && <p style={{ color: 'red' }}>{socketError}</p>}
      </div>
    );
  }

  const expiresMs = new Date(negotiation.expiresAt).getTime();
  const remainingMs = expiresMs - nowMs;
  const statusText = String(negotiation.status || '').toLowerCase();
  const isActive = statusText === 'active' && remainingMs > 0;

  const myDecision =
    role === 'REGULAR'
      ? negotiation.decisions?.candidate
      : negotiation.decisions?.business;

  const otherDecision =
    role === 'REGULAR'
      ? negotiation.decisions?.business
      : negotiation.decisions?.candidate;

  const otherParty =
    role === 'REGULAR'
      ? negotiation.job?.business?.business_name || 'Business'
      : `${negotiation.user?.first_name || ''} ${negotiation.user?.last_name || ''}`.trim() || 'User';

  return (
    <div style={styles.detailCard}>
      <h1>My Negotiation</h1>

      {actionMessage && <p style={{ color: 'green' }}>{actionMessage}</p>}
      {actionError && <p style={{ color: 'red' }}>{actionError}</p>}
      {socketError && <p style={{ color: 'red' }}>{socketError}</p>}

      <p><strong>Negotiation ID:</strong> {negotiation.id}</p>
      <p><strong>Status:</strong> <StatusBadge value={negotiation.status} /></p>
      <p><strong>Socket:</strong> {socketState}</p>
      <p><strong>Expires At:</strong> {formatDateTime(negotiation.expiresAt)}</p>
      <p><strong>Countdown:</strong> {formatRemaining(remainingMs)}</p>

      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <h2>Job</h2>
        <p><strong>Job ID:</strong> {negotiation.job?.id}</p>
        <p><strong>Position Type:</strong> {negotiation.job?.position_type?.name}</p>
        <p><strong>Business:</strong> {negotiation.job?.business?.business_name}</p>
        <p><strong>Salary:</strong> ${negotiation.job?.salary_min} - ${negotiation.job?.salary_max}</p>
        <p><strong>Start:</strong> {formatDateTime(negotiation.job?.start_time)}</p>
        <p><strong>End:</strong> {formatDateTime(negotiation.job?.end_time)}</p>
      </div>

      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <h2>Other Party</h2>
        <p><strong>Name:</strong> {otherParty}</p>
      </div>

      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <h2>Decisions</h2>
        <p><strong>My Decision:</strong> <StatusBadge value={myDecision || 'pending'} /></p>
        <p><strong>Other Side:</strong> <StatusBadge value={otherDecision || 'pending'} /></p>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
        <button
          type="button"
          style={styles.button}
          disabled={!isActive}
          onClick={() => handleDecision('accept')}
        >
          Accept
        </button>
        <button
          type="button"
          style={styles.secondaryButton}
          disabled={!isActive}
          onClick={() => handleDecision('decline')}
        >
          Decline
        </button>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => loadNegotiation(false)}
        >
          Refresh
        </button>
      </div>

      {!isActive && (
        <p style={{ marginTop: '12px' }}>
          This negotiation is no longer active.
        </p>
      )}

      <div style={{ marginTop: '28px' }}>
        <h2>Live Negotiation Chat</h2>
        <p style={{ marginBottom: '12px' }}>
          Live-only chat. Message history is not persisted.
        </p>

        <div
          style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '12px',
            minHeight: '180px',
            maxHeight: '280px',
            overflowY: 'auto',
            background: '#fafafa',
          }}
        >
          {chatMessages.length === 0 ? (
            <p style={{ margin: 0 }}>No live messages yet.</p>
          ) : (
            chatMessages.map((msg, index) => {
              const mine =
                (role === 'REGULAR' && msg.sender?.role === 'regular') ||
                (role === 'BUSINESS' && msg.sender?.role === 'business');

              return (
                <div
                  key={`${msg.createdAt}-${index}`}
                  style={{
                    marginBottom: '12px',
                    padding: '10px',
                    borderRadius: '8px',
                    background: mine ? '#e8f4ff' : '#f1f1f1',
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600 }}>
                    {mine ? 'You' : msg.sender?.role === 'business' ? 'Business' : 'Regular User'}
                  </p>
                  <p style={{ margin: '6px 0' }}>{msg.text}</p>
                  <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.75 }}>
                    {formatDateTime(msg.createdAt)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSendMessage} style={{ marginTop: '12px' }}>
          <input
            type="text"
            value={chatText}
            onChange={(e) => setChatText(e.target.value)}
            placeholder={isActive ? 'Type a negotiation message...' : 'Negotiation is inactive'}
            disabled={!isActive}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              marginBottom: '10px',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            style={styles.button}
            disabled={!isActive || !chatText.trim()}
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  );
}

function MyInterestsPage() {
  const token = localStorage.getItem('token');

  const [interests, setInterests] = useState([]);
  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const pageSize = 5;

  async function loadInterestsPage(currentPage = page) {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE}/users/me/interests?page=${currentPage}&limit=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load interests');
      }

      setInterests(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInterestsPage(page);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  if (loading) {
    return <h1>Loading my interests...</h1>;
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
      <h1>My Interests</h1>

      <p><strong>Total Results:</strong> {count}</p>

      {interests.length === 0 ? (
        <p>No interested jobs found.</p>
      ) : (
        <div style={styles.list}>
          {interests.map((interest) => (
            <div key={interest.interest_id} style={styles.listCard}>
              <h2>{interest.job?.position_type?.name || 'Unknown Position Type'}</h2>

              <p><strong>Interest ID:</strong> {interest.interest_id}</p>
              <p><strong>Job ID:</strong> {interest.job?.id}</p>
              
              {/* Corrected Status line */}
              <p><strong>Status:</strong> <StatusBadge value={interest.job?.status} /></p>
              
              <p><strong>Business:</strong> {interest.job?.business?.business_name}</p>
              <p><strong>Salary:</strong> ${interest.job?.salary_min} - ${interest.job?.salary_max}</p>
              <p><strong>Start:</strong> {formatDateTime(interest.job?.start_time)}</p>
              <p><strong>End:</strong> {formatDateTime(interest.job?.end_time)}</p>
              
              {/* Corrected Mutual Interest line */}
              <p>
                <strong>Mutual Interest:</strong>{' '}
                <StatusBadge value={interest.mutual ? 'mutual' : 'not mutual'} />
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                <Link to={`/jobs/${interest.job?.id}`} style={styles.smallButton}>
                  View Job
                </Link>

                {interest.mutual && (
                  <Link to="/negotiation" style={styles.smallButton}>
                    Open Negotiation
                  </Link>
                )}
              </div>

              {!interest.mutual && (
                <p style={{ marginTop: '12px' }}>
                  Negotiation is not available until mutual interest is reached.
                </p>
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

function MyInvitationsPage() {
  const token = localStorage.getItem('token');

  const [invitations, setInvitations] = useState([]);
  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [page, setPage] = useState(1);
  const pageSize = 5;

  async function loadInvitationsPage(currentPage = page) {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE}/users/me/invitations?page=${currentPage}&limit=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load invitations');
      }

      setInvitations(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvitationsPage(page);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  if (loading) {
    return <h1>Loading invitations...</h1>;
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
      <h1>My Invitations</h1>

      <p><strong>Total Results:</strong> {count}</p>

      {invitations.length === 0 ? (
        <p>No invitations found.</p>
      ) : (
        <div style={styles.list}>
          {invitations.map((job) => (
            <div key={job.id} style={styles.listCard}>
              <h2>{job.position_type?.name || 'Unknown Position Type'}</h2>

              <p><strong>Job ID:</strong> {job.id}</p>
              <p><strong>Status:</strong> <StatusBadge value={job.status} /></p>
              <p><strong>Business:</strong> {job.business?.business_name}</p>
              <p><strong>Salary:</strong> ${job.salary_min} - ${job.salary_max}</p>
              <p><strong>Start:</strong> {formatDateTime(job.start_time)}</p>
              <p><strong>End:</strong> {formatDateTime(job.end_time)}</p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
                <Link to={`/jobs/${job.id}`} style={styles.smallButton}>
                  View Job
                </Link>
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
            <Route
              path="/admin/system"
              element={
                <AdminRoute authToken={authToken}>
                  <AdminSystemConfigPage />
                </AdminRoute>
              }
            />
            <Route
              path="/business/jobs/:jobId/candidates"
              element={
                <ProtectedRoute authToken={authToken}>
                  <BusinessJobCandidatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/jobs/:jobId/candidates/:userId"
              element={
                <ProtectedRoute authToken={authToken}>
                  <BusinessCandidateDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/business/jobs/:jobId/interests"
              element={
                <ProtectedRoute authToken={authToken}>
                  <BusinessJobInterestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/negotiation"
              element={
                <ProtectedRoute authToken={authToken}>
                  <MyNegotiationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-interests"
              element={
                <ProtectedRoute authToken={authToken}>
                  <MyInterestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-invitations"
              element={
                <ProtectedRoute authToken={authToken}>
                  <MyInvitationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <div style={styles.detailCard}>
                  <h1>Page Not Found</h1>
                  <p>The page you requested does not exist.</p>
                </div>
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
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    padding: '14px 24px',
    backgroundColor: '#132032',
    position: 'sticky',
    top: 0,
    zIndex: 1000,
  },

  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flexWrap: 'wrap',
  },

  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: 'auto',
  },

  dropdown: {
    position: 'relative',
  },

  navMenuButton: {
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: '6px',
    cursor: 'pointer',
  },

  dropdownMenu: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    minWidth: '220px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },

  dropdownItem: {
    color: '#111827',
    textDecoration: 'none',
    fontWeight: 'bold',
    padding: '10px 12px',
    borderRadius: '6px',
    backgroundColor: 'white',
  },

  navMenuLink: {
    display: 'block',
    padding: '10px 12px',
    borderRadius: '8px',
    color: '#111827',
    textDecoration: 'none',
    fontWeight: 600,
  },
};