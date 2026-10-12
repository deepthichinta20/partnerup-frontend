import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:8081/students';
const PROJECT_API_URL = 'http://localhost:8081/projects';
const JOIN_REQUEST_API_URL = 'http://localhost:8081/join-requests';
const MATCH_API_URL = 'http://localhost:8081/matching/project';

const CATEGORIES = [
  { key: 'iot', label: 'IoT & Embedded', icon: '⌁', color: 'lavender' },
  { key: 'web', label: 'Web Development', icon: '⌘', color: 'peach' },
  { key: 'data', label: 'Data Analytics', icon: '⌗', color: 'mint' },
  { key: 'ai', label: 'AI & Machine Learning', icon: '◈', color: 'sky' },
  { key: 'design', label: 'Design & Creativity', icon: '✺', color: 'rose' },
];

const HEADING = 'Find your people. Build something meaningful.';

const categoryOf = (key) =>
  CATEGORIES.find((item) => item.key === key) || CATEGORIES[0];

const parseSkills = (text) =>
  String(text || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);

const isEmail = (text) => /^\S+@\S+\.\S+$/.test(text);

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Browser storage may be unavailable.
    }
  }, [key, value]);

  return [value, setValue];
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button
            className="modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && (
        <span className="field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function PostProjectForm({ onSubmit, onCancel, initialName = '' }) {
  const [form, setForm] = useState({
    title: '',
    category: 'web',
    description: '',
    skills: '',
    needed: 2,
    owner: initialName,
  });

  const [errors, setErrors] = useState({});

  const update = (key) => (event) =>
    setForm((old) => ({ ...old, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    const next = {};

    if (form.title.trim().length < 3) {
      next.title = 'Enter a title of at least 3 characters.';
    }
    if (form.description.trim().length < 20) {
      next.description = 'Enter at least 20 characters.';
    }
    if (!parseSkills(form.skills).length) {
      next.skills = 'Add at least one skill.';
    }
    if (!form.owner.trim()) {
      next.owner = 'Enter the project owner name.';
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    onSubmit({
      title: form.title.trim(),
      category: form.category,
      description: form.description.trim(),
      skills: parseSkills(form.skills),
      needed: Math.min(10, Math.max(1, Number(form.needed) || 1)),
      owner: form.owner.trim(),
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Project title" error={errors.title}>
        <input
          value={form.title}
          onChange={update('title')}
          placeholder="e.g. Library seat tracker"
          autoFocus
        />
      </Field>

      <div className="form-row">
        <Field label="Category">
          <select value={form.category} onChange={update('category')}>
            {CATEGORIES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Teammates needed">
          <input
            type="number"
            min="1"
            max="10"
            value={form.needed}
            onChange={update('needed')}
          />
        </Field>
      </div>

      <Field label="What are you building?" error={errors.description}>
        <textarea
          rows="4"
          value={form.description}
          onChange={update('description')}
        />
      </Field>

      <Field
        label="Skills needed"
        error={errors.skills}
        hint="Separate skills with commas"
      >
        <input
          value={form.skills}
          onChange={update('skills')}
          placeholder="React, Java, IoT"
        />
      </Field>

      <Field label="Your name" error={errors.owner}>
        <input
          value={form.owner}
          onChange={update('owner')}
          placeholder="Project owner's name"
        />
      </Field>

      <div className="modal-actions">
        <button type="button" className="button-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button-primary">
          Post project
        </button>
      </div>
    </form>
  );
}

function JoinForm({ project, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    message: '',
  });

  const [errors, setErrors] = useState({});

  const update = (key) => (event) =>
    setForm((old) => ({ ...old, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    const next = {};

    if (!form.name.trim()) next.name = 'Enter your name.';
    if (!isEmail(form.email.trim())) {
      next.email = 'Enter a valid email address.';
    }
    if (form.message.trim().length < 10) {
      next.message = 'Write at least 10 characters.';
    }

    setErrors(next);

    if (!Object.keys(next).length) {
      onSubmit({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <p className="modal-intro">
        You're asking to join <strong>{project.title}</strong>, posted by{' '}
        {project.owner}.
      </p>

      <Field label="Your name" error={errors.name}>
        <input value={form.name} onChange={update('name')} autoFocus />
      </Field>

      <Field label="Email" error={errors.email}>
        <input
          type="email"
          value={form.email}
          onChange={update('email')}
          placeholder="you@college.edu"
        />
      </Field>

      <Field
        label="Why would you be a good fit?"
        error={errors.message}
      >
        <textarea
          rows="4"
          value={form.message}
          onChange={update('message')}
          placeholder="Share your skills and availability."
        />
      </Field>

      <div className="modal-actions">
        <button type="button" className="button-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button-primary">
          Send request
        </button>
      </div>
    </form>
  );
}

function ProfileForm({ initialProfile, onSubmit, onCancel }) {
  const [form, setForm] = useState(() =>
    initialProfile
      ? {
          name: initialProfile.name || '',
          course: initialProfile.course || '',
          skills: (initialProfile.skills || []).join(', '),
          goal: initialProfile.goal || '',
          email: initialProfile.email || '',
        }
      : { name: '', course: '', skills: '', goal: '', email: '' }
  );

  const [errors, setErrors] = useState({});

  const update = (key) => (event) =>
    setForm((old) => ({ ...old, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    const next = {};

    if (!form.name.trim()) next.name = 'Enter your name.';
    if (!form.course.trim()) next.course = 'Enter your course and year.';
    if (!parseSkills(form.skills).length) {
      next.skills = 'Add at least one skill.';
    }
    if (form.email.trim() && !isEmail(form.email.trim())) {
      next.email = 'Enter a valid email.';
    }

    setErrors(next);
    if (Object.keys(next).length) return;

    onSubmit({
      id: initialProfile?.id,
      name: form.name.trim(),
      course: form.course.trim(),
      skills: parseSkills(form.skills),
      goal: form.goal.trim() || 'Open to project ideas',
      email: form.email.trim(),
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <Field label="Your name" error={errors.name}>
        <input value={form.name} onChange={update('name')} autoFocus />
      </Field>

      <Field label="Course and year" error={errors.course}>
        <input
          value={form.course}
          onChange={update('course')}
          placeholder="ECE · Year 3"
        />
      </Field>

      <Field label="Email" error={errors.email}>
        <input
          type="email"
          value={form.email}
          onChange={update('email')}
          placeholder="you@college.edu"
        />
      </Field>

      <Field
        label="Your skills"
        error={errors.skills}
        hint="Separate skills with commas"
      >
        <input
          value={form.skills}
          onChange={update('skills')}
          placeholder="Java, IoT, React"
        />
      </Field>

      <Field label="What would you like to build?">
        <input
          value={form.goal}
          onChange={update('goal')}
          placeholder="A project you'd love to work on"
        />
      </Field>

      <div className="modal-actions">
        <button type="button" className="button-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button-primary">
          Save profile
        </button>
      </div>
    </form>
  );
}

/* Handles common response formats without assuming the backend's
   recommendation field names. */

function getMatchPercentage(result) {
  if (typeof result === 'number') return result;

  if (!result || typeof result !== 'object') return null;

  const value =
    result.matchPercentage ??
    result.matchScore ??
    result.percentage ??
    result.score;

  return typeof value === 'number' ? value : null;
}

function getRecommendations(result) {
  if (Array.isArray(result)) return result;

  if (!result || typeof result !== 'object') return [];

  return (
    result.matches ||
    result.recommendations ||
    result.teammates ||
    result.students ||
    result.candidates ||
    result.results ||
    []
  );
}



function MatchResults({ result }) {
  const recommendations = getRecommendations(result);

  return (
    <div className="match-results" aria-live="polite">
      <h4>Recommended teammates</h4>

      {recommendations.length === 0 ? (
        <p className="no-matches">
          No matching students found yet. Try adding more skills to your project.
        </p>
      ) : (
        <div className="match-people-list">
          {recommendations.map((item, index) => {
            const student = item.student || item;
            const name = student.name || `Student ${index + 1}`;

            const skills = Array.isArray(student.skills)
              ? student.skills
              : String(student.skills || "")
                  .split(",")
                  .map((skill) => skill.trim())
                  .filter(Boolean);

            const percentage = Number(item.matchPercentage ?? 0);

            return (
              <div
                className="match-person"
                key={student.id ?? `${name}-${index}`}
              >
                <div className="match-person-details">
                  <strong className="match-person-name">
                    {name}
                  </strong>

                  <p className="match-person-interest">
                    {student.interests || "Open to project ideas"}
                  </p>

                  <div className="skills-list">
                    {skills.map((skill, skillIndex) => (
                      <span key={`${skill}-${skillIndex}`}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="match-person-score">
                  <strong>{percentage}%</strong>
                  <span>match</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}



function Dashboard({
  projects,
  joinRequests,
  currentProfile,
  onCreateProfile,
  onBackToSite,
  updateRequestStatus,
}) {
  const [section, setSection] = useState('overview');

  const myProjects = currentProfile
    ? projects.filter(
        (p) =>
          p.owner?.trim().toLowerCase() ===
          currentProfile.name?.trim().toLowerCase()
      )
    : [];

  const myRequests = joinRequests.filter(
    (r) =>
      currentProfile &&
      r.requesterName?.trim().toLowerCase() ===
        currentProfile.name?.trim().toLowerCase()
  );

  const incomingRequests = joinRequests.filter((r) =>
    myProjects.some((p) => Number(p.id) === Number(r.projectId))
  );

  const recentItems = [
    ...myProjects.map((p) => ({
      id: `p-${p.id}`,
      title: `You posted "${p.title}"`,
      detail: 'Project created',
      date: Number(p.id) || 0,
    })),
    ...myRequests.map((r) => ({
      id: `r-${r.id}`,
      title: `You requested to join project #${r.projectId}`,
      detail: `Join request ${r.status || 'PENDING'}`,
      date: Number(r.id) || 0,
    })),
  ]
    .sort((a, b) => b.date - a.date)
    .slice(0, 5);

  const navItems = [
    { id: 'overview', icon: '⌂', label: 'Overview' },
    { id: 'profile', icon: '◉', label: 'My Profile' },
    { id: 'projects', icon: '▤', label: 'My Projects' },
    { id: 'requests', icon: '↗', label: 'My Requests' },
    { id: 'activity', icon: '◷', label: 'Activity' },
  ];

  const incomingPanel = (
    <section className="dashboard-panel incoming-requests-panel">
      <div className="dashboard-panel-heading">
        <div>
          <h2>Incoming requests</h2>
          <p>Students interested in joining your projects</p>
        </div>
        <span>{incomingRequests.length} total</span>
      </div>

      {incomingRequests.length ? (
        <div className="dashboard-activity-list">
          {incomingRequests.map((request) => {
            const project = myProjects.find(
              (p) => Number(p.id) === Number(request.projectId)
            );
            const status = request.status || 'PENDING';

            return (
              <div className="dashboard-activity-item" key={request.id}>
                <span className="dashboard-activity-dot" />
                <div>
                  <strong>{request.requesterName || 'Student'}</strong>
                  <p>Interested in: {project?.title || 'Your project'}</p>
                  <p>{request.email}</p>
                  {request.message && <p>{request.message}</p>}
                  <p>
                    <strong>Status: {status}</strong>
                  </p>

                  {status === 'PENDING' ? (
                    <div className="request-actions">
                      <button
                        type="button"
                        className="button-primary"
                        onClick={() =>
                          updateRequestStatus(request.id, 'ACCEPTED')
                        }
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="button-secondary"
                        onClick={() =>
                          updateRequestStatus(request.id, 'REJECTED')
                        }
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <p>This request has already been processed.</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="dashboard-empty">
          <span>↗</span>
          <strong>No incoming requests yet</strong>
          <p>Requests for projects owned by your profile will appear here.</p>
        </div>
      )}
    </section>
  );

  return (
    <section className="dashboard-shell page-width">
      <aside className="dashboard-sidebar">
        <p className="dashboard-side-label">YOUR SPACE</p>

        {navItems.map((item) => (
          <button
            key={item.id}
            className={`dashboard-nav-item ${
              section === item.id ? 'active' : ''
            }`}
            onClick={() => setSection(item.id)}
          >
            <span className="dashboard-nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="dashboard-sidebar-bottom">
          <div className="dashboard-mini-profile">
            <div className="dashboard-avatar">
              {currentProfile?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <strong>{currentProfile?.name || 'Your profile'}</strong>
              <span>{currentProfile?.course || 'Not set up yet'}</span>
            </div>
          </div>

          <button className="dashboard-back-link" onClick={onBackToSite}>
            ← Back to PartnerUp
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <div className="dashboard-topline">
          <span className="dashboard-kicker">PARTNERUP / YOUR SPACE</span>
          <span className="dashboard-status">
            <i /> Student workspace
          </span>
        </div>

        {section === 'overview' && (
          <>
            <div className="dashboard-heading">
              <div>
                <p className="eyebrow">YOUR DASHBOARD</p>
                <h1>
                  Welcome
                  {currentProfile
                    ? `, ${currentProfile.name.split(' ')[0]}`
                    : ' back'}
                  .
                </h1>
                <p>Keep track of your projects, people, and progress.</p>
              </div>
              <button className="button-primary" onClick={onCreateProfile}>
                {currentProfile ? 'Edit profile' : 'Set up your profile +'}
              </button>
            </div>

            <div className="dashboard-stat-grid">
              <article className="dashboard-stat-card">
                <span className="dashboard-stat-icon">▤</span>
                <p>My projects</p>
                <strong>{myProjects.length}</strong>
                <small>Projects posted by you</small>
              </article>

              <article className="dashboard-stat-card">
                <span className="dashboard-stat-icon">↗</span>
                <p>Requests sent</p>
                <strong>{myRequests.length}</strong>
                <small>Your submitted join requests</small>
              </article>

              <article className="dashboard-stat-card">
                <span className="dashboard-stat-icon">✳</span>
                <p>Incoming interest</p>
                <strong>{incomingRequests.length}</strong>
                <small>Requests on your projects</small>
              </article>

              <article className="dashboard-stat-card">
                <span className="dashboard-stat-icon">◉</span>
                <p>Profile status</p>
                <strong>{currentProfile ? 'Ready' : 'Setup'}</strong>
                <small>
                  {currentProfile
                    ? 'Your profile is saved here'
                    : 'Add your details to get started'}
                </small>
              </article>
            </div>

            <div className="dashboard-content-grid">
              <section className="dashboard-panel">
                <div className="dashboard-panel-heading">
                  <div>
                    <h2>Recent activity</h2>
                    <p>Your latest activity on PartnerUp</p>
                  </div>
                  <button onClick={() => setSection('activity')}>
                    View all →
                  </button>
                </div>

                {recentItems.length ? (
                  <div className="dashboard-activity-list">
                    {recentItems.slice(0, 3).map((item) => (
                      <div className="dashboard-activity-item" key={item.id}>
                        <span className="dashboard-activity-dot" />
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-empty">
                    <strong>Your story starts here</strong>
                    <p>
                      Post a project or request to join one, and your activity
                      will appear here.
                    </p>
                  </div>
                )}
              </section>

              <section className="dashboard-panel dashboard-profile-panel">
                <div className="dashboard-panel-heading">
                  <div>
                    <h2>My profile</h2>
                    <p>How other students see you</p>
                  </div>
                  <button onClick={() => setSection('profile')}>
                    View →
                  </button>
                </div>

                {currentProfile ? (
                  <>
                    <div className="dashboard-profile-intro">
                      <div className="dashboard-avatar dashboard-avatar-large">
                        {currentProfile.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <strong>{currentProfile.name}</strong>
                        <p>{currentProfile.course}</p>
                      </div>
                    </div>
                    <p className="dashboard-goal-label">LOOKING TO BUILD</p>
                    <p className="dashboard-goal">{currentProfile.goal}</p>
                    <div className="dashboard-tags">
                      {(currentProfile.skills || []).map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="dashboard-empty">
                    <strong>Add a little about yourself</strong>
                    <p>
                      Share your skills and the projects you'd love to build.
                    </p>
                    <button
                      className="button-secondary"
                      onClick={onCreateProfile}
                    >
                      Create profile
                    </button>
                  </div>
                )}
              </section>
            </div>

            {incomingPanel}
          </>
        )}

        {section === 'profile' && (
          <section className="dashboard-panel dashboard-full-panel">
            <div className="dashboard-heading">
              <div>
                <p className="eyebrow">ABOUT YOU</p>
                <h1>My Profile</h1>
                <p>Your profile helps teammates understand what you bring.</p>
              </div>
              <button className="button-primary" onClick={onCreateProfile}>
                Edit profile
              </button>
            </div>

            {currentProfile ? (
              <>
                <div className="dashboard-profile-intro">
                  <div className="dashboard-avatar dashboard-avatar-large">
                    {currentProfile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2>{currentProfile.name}</h2>
                    <p>{currentProfile.course}</p>
                    <p>{currentProfile.email}</p>
                  </div>
                </div>

                <h3 className="dashboard-subheading">Skills</h3>
                <div className="dashboard-tags">
                  {(currentProfile.skills || []).map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>

                <h3 className="dashboard-subheading">
                  Interested in building
                </h3>
                <p>{currentProfile.goal}</p>
              </>
            ) : (
              <div className="dashboard-empty">
                <strong>Your profile isn't set up yet.</strong>
                <p>Create your profile to show your skills and interests.</p>
                <button className="button-primary" onClick={onCreateProfile}>
                  Create my profile
                </button>
              </div>
            )}
          </section>
        )}

        {section === 'projects' && (
          <section className="dashboard-panel dashboard-full-panel">
            <div className="dashboard-heading">
              <div>
                <p className="eyebrow">WHAT YOU'RE BUILDING</p>
                <h1>My Projects</h1>
                <p>Projects posted using your profile name appear here.</p>
              </div>
            </div>

            {myProjects.length ? (
              <div className="dashboard-list-cards">
                {myProjects.map((p) => (
                  <article key={p.id} className="dashboard-list-card">
                    <div>
                      <h3>{p.title}</h3>
                      <p>{p.description}</p>
                      <div className="dashboard-tags">
                        {(p.skills || []).map((s) => (
                          <span key={s}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <span className="dashboard-count-pill">
                      {
                        joinRequests.filter(
                          (r) => Number(r.projectId) === Number(p.id)
                        ).length
                      }{' '}
                      requests
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <strong>No projects posted by you yet</strong>
                <p>Post your idea and find teammates who want to build it.</p>
                <button className="button-primary" onClick={onBackToSite}>
                  Explore the site to post a project
                </button>
              </div>
            )}

            {incomingPanel}
          </section>
        )}

        {section === 'requests' && (
          <section className="dashboard-panel dashboard-full-panel">
            <div className="dashboard-heading">
              <div>
                <p className="eyebrow">FIND YOUR TEAM</p>
                <h1>My Requests</h1>
                <p>Projects you've asked to join.</p>
              </div>
            </div>

            {myRequests.length ? (
              <div className="dashboard-list-cards">
                {myRequests.map((r) => (
                  <article key={r.id} className="dashboard-list-card">
                    <div>
                      <h3>
                        {projects.find(
                          (p) => Number(p.id) === Number(r.projectId)
                        )?.title || `Project #${r.projectId}`}
                      </h3>
                      <p>{r.message}</p>
                      <p>{r.email}</p>
                    </div>
                    <span className="dashboard-count-pill">
                      {r.status || 'PENDING'}
                    </span>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <strong>No requests yet</strong>
                <p>
                  Explore projects and request to join a team that interests
                  you.
                </p>
                <button className="button-primary" onClick={onBackToSite}>
                  Explore projects
                </button>
              </div>
            )}
          </section>
        )}

        {section === 'activity' && (
          <section className="dashboard-panel dashboard-full-panel">
            <div className="dashboard-heading">
              <div>
                <p className="eyebrow">YOUR LATEST UPDATES</p>
                <h1>Activity</h1>
                <p>A timeline of your project actions.</p>
              </div>
            </div>

            {recentItems.length ? (
              <div className="dashboard-activity-list dashboard-activity-list-large">
                {recentItems.map((item) => (
                  <div className="dashboard-activity-item" key={item.id}>
                    <span className="dashboard-activity-dot" />
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <strong>No activity yet.</strong>
                <p>Your project activity will appear here.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </section>
  );
}

function App() {
  const [typedText, setTypedText] = useState('');
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState('');
  const [joinRequests, setJoinRequests] = useState([]);

  const [requestedIds, setRequestedIds] = useStoredState(
    'partnerup:requested',
    []
  );
  const [currentProfile, setCurrentProfile] = useStoredState(
    'partnerup:currentProfile',
    null
  );

  const [activePage, setActivePage] = useState('home');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [studentQuery, setStudentQuery] = useState('');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');

  // Matching state
  const [matchResults, setMatchResults] = useState({});
  const [matchingProjectId, setMatchingProjectId] = useState(null);
  const [matchErrors, setMatchErrors] = useState({});

  const closeModal = () => setModal(null);

  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setTypedText(HEADING);
      return undefined;
    }

    let index = 0;
    const timer = setInterval(() => {
      index += 1;
      setTypedText(HEADING.slice(0, index));
      if (index >= HEADING.length) clearInterval(timer);
    }, 38);

    return () => clearInterval(timer);
  }, []);

  // Load projects
  useEffect(() => {
    fetch(PROJECT_API_URL)
      .then((r) => {
        if (!r.ok) throw new Error('Could not load projects from the backend.');
        return r.json();
      })
      .then((data) =>
        setProjects(
          data.map((p) => {
            const requiredSkills = p.requiredSkills || '';

            const categoryText =
              `${p.title || ''} ${requiredSkills}`.toLowerCase();

            let projectCategory = 'web';
            if (/iot|embedded|sensor|irrigation/.test(categoryText)) {
              projectCategory = 'iot';
            } else if (/data|analytics|sql/.test(categoryText)) {
              projectCategory = 'data';
            } else if (/ai|machine learning|model/.test(categoryText)) {
              projectCategory = 'ai';
            } else if (/design|creative|ui|ux/.test(categoryText)) {
              projectCategory = 'design';
            }

            return {
              id: p.id,
              title: p.title,
              description: p.description,
              category: projectCategory,
              skills: requiredSkills
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              needed: 2,
              owner: p.createdBy || 'Student',
              requests: [],
            };
          })
        )
      )
      .catch((e) => setProjectsError(e.message))
      .finally(() => setProjectsLoading(false));
  }, []);

  // Load students
  useEffect(() => {
    fetch(API_URL)
      .then((r) => {
        if (!r.ok) throw new Error('Could not load students from the backend.');
        return r.json();
      })
      .then((data) =>
        setStudents(
          data.map((s) => ({
            ...s,
            course: s.course || 'Course not specified',
            skills: Array.isArray(s.skills)
              ? s.skills
              : String(s.skills || '')
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean),
            goal: s.goal || s.interests || 'Open to project ideas',
          }))
        )
      )
      .catch((e) => setStudentsError(e.message))
      .finally(() => setStudentsLoading(false));
  }, []);

  const loadJoinRequests = async () => {
    try {
      const response = await fetch(JOIN_REQUEST_API_URL);
      if (!response.ok) throw new Error('Could not load join requests.');
      setJoinRequests(await response.json());
    } catch (error) {
      console.error('Error loading join requests:', error);
    }
  };

  useEffect(() => {
    loadJoinRequests();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredProjects = useMemo(() => {
    const search = query.trim().toLowerCase();

    return projects.filter((p) => {
      if (category !== 'all' && p.category !== category) return false;

      return (
        !search ||
        [p.title, p.description, p.owner, ...(p.skills || [])]
          .join(' ')
          .toLowerCase()
          .includes(search)
      );
    });
  }, [projects, query, category]);

  const filteredStudents = useMemo(() => {
    const search = studentQuery.trim().toLowerCase();

    return !search
      ? students
      : students.filter((s) =>
          [s.name, s.course, s.goal, ...(s.skills || [])]
            .join(' ')
            .toLowerCase()
            .includes(search)
        );
  }, [students, studentQuery]);

  // NEW: Call the existing Spring Boot matching endpoint
  
const findMatches = async (projectId) => {
  setMatchingProjectId(projectId);
  setMatchErrors((old) => ({ ...old, [projectId]: '' }));

  try {
    const response = await fetch(
      `http://localhost:8081/matching/project/${projectId}`
    );

    if (!response.ok) {
      throw new Error(`Matching failed: HTTP ${response.status}`);
    }

    const result = await response.json();

    if (!Array.isArray(result)) {
      throw new Error('Unexpected response format from matching API.');
    }

    setMatchResults((old) => ({
      ...old,
      [projectId]: result,
    }));
  } catch (error) {
    console.error('Matching error:', error);
    setMatchErrors((old) => ({
      ...old,
      [projectId]:
        error.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Check that Spring Boot is running and CORS allows http://localhost:5173.'
          : error.message,
    }));
  } finally {
    setMatchingProjectId(null);
  }
};

  const addProject = async (project) => {
    try {
      const response = await fetch(PROJECT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: project.title,
          description: project.description,
          requiredSkills: project.skills.join(', '),
          createdBy: project.owner,
        }),
      });

      if (!response.ok) {
        throw new Error('Could not save the project. Please try again.');
      }

      const saved = await response.json();

      const item = {
        ...project,
        id: saved.id,
        title: saved.title,
        description: saved.description,
        skills: (saved.requiredSkills || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        owner: saved.createdBy || project.owner,
        requests: [],
      };

      setProjects((old) => [
        item,
        ...old.filter((p) => Number(p.id) !== Number(saved.id)),
      ]);

      closeModal();
      setQuery('');
      setCategory('all');
      setToast('Your project was saved to the backend!');

      setTimeout(() => scrollTo('projects'), 100);
    } catch (error) {
      setToast(error.message || 'Unable to connect to the backend.');
    }
  };

  const sendJoinRequest = async (project, request) => {
    try {
      const response = await fetch(JOIN_REQUEST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          requesterName: request.name,
          email: request.email,
          message: request.message,
        }),
      });

      if (!response.ok) throw new Error('Failed to send join request.');

      const saved = await response.json();

      setJoinRequests((old) => [...old, saved]);

      setRequestedIds((old) =>
        old.includes(project.id) ? old : [...old, project.id]
      );

      setProjects((old) =>
        old.map((p) =>
          Number(p.id) === Number(project.id)
            ? { ...p, requests: [...(p.requests || []), saved] }
            : p
        )
      );

      closeModal();
      setToast(`Request sent to ${project.owner}.`);
    } catch (error) {
      console.error('Join request error:', error);
      setToast(error.message || 'Could not send request.');
    }
  };

  const updateRequestStatus = async (requestId, status) => {
    try {
      const response = await fetch(
        `${JOIN_REQUEST_API_URL}/${requestId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) throw new Error('Failed to update request.');

      const updated = await response.json();

      setJoinRequests((old) =>
        old.map((r) =>
          Number(r.id) === Number(updated.id) ? updated : r
        )
      );

      setToast(`Request ${status.toLowerCase()} successfully!`);
    } catch (error) {
      console.error('Request update error:', error);
      setToast(error.message || 'Could not update request.');
    }
  };

  const addStudent = async (student) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: student.name,
          email: student.email || '',
          skills: student.skills.join(', '),
          interests: student.goal,
          availability: 'Weekends',
        }),
      });

      if (!response.ok) {
        throw new Error('Could not save your profile. Please try again.');
      }

      const saved = await response.json();

      const profile = {
        ...student,
        id: saved.id,
        name: saved.name || student.name,
        skills: Array.isArray(saved.skills)
          ? saved.skills
          : String(saved.skills || student.skills.join(', '))
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
      };

      setStudents((old) => [
        profile,
        ...old.filter((s) => Number(s.id) !== Number(profile.id)),
      ]);

      setCurrentProfile(profile);
      closeModal();
      setToast('Your profile was saved to the backend!');
    } catch (error) {
      setToast(error.message || 'Unable to connect to the backend.');
    }
  };

  const resetFilters = () => {
    setQuery('');
    setCategory('all');
  };

  return (
    <div className="app">
      <nav className="navbar" aria-label="Main">
        <a
          className="brand"
          href="#home"
          onClick={() => setActivePage('home')}
        >
          partner<span>up.</span>
        </a>

        <div className="nav-links">
          <a href="#projects" onClick={() => setActivePage('home')}>
            Projects
          </a>
          <a href="#students" onClick={() => setActivePage('home')}>
            Students
          </a>
          <a href="#how-it-works" onClick={() => setActivePage('home')}>
            How it works
          </a>
          <button
            className="nav-dashboard-link"
            onClick={() => {
              setActivePage('dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Dashboard
          </button>
        </div>

        <button className="nav-button" onClick={() => setModal('post')}>
          Post a project <span>+</span>
        </button>
      </nav>

      {activePage === 'dashboard' ? (
        <Dashboard
          projects={projects}
          joinRequests={joinRequests}
          currentProfile={currentProfile}
          onCreateProfile={() => setModal('profile')}
          onBackToSite={() => {
            setActivePage('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          updateRequestStatus={updateRequestStatus}
        />
      ) : (
        <main id="home">
          <section className="hero page-width">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                Made for student builders
              </div>

              <h1 aria-label={HEADING}>
                <span aria-hidden="true">{typedText}</span>
                <span className="typing-cursor">|</span>
              </h1>

              <p className="hero-description">
                Great ideas get better with the right people. Discover student
                projects, meet people with complementary skills, and start
                building something you're proud of.
              </p>

              <div className="hero-actions">
                <button
                  className="button-primary"
                  onClick={() => scrollTo('projects')}
                >
                  Explore projects ↗
                </button>
                <button
                  className="button-secondary"
                  onClick={() => setModal('post')}
                >
                  Post your idea
                </button>
              </div>

              <div className="hero-proof">
                <div className="avatar-stack">
                  <span>D</span>
                  <span>A</span>
                  <span>S</span>
                  <span>+</span>
                </div>
                <p>
                  <strong>
                    {projects.length} projects · {students.length} students
                  </strong>
                  <br />
                  Your next teammate could be here.
                </p>
              </div>
            </div>

            <div className="hero-art" aria-hidden="true">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <span className="spark spark-one">✳</span>
              <span className="spark spark-two">✦</span>

              <div className="profile-preview">
                <div className="preview-top">
                  <span className="preview-label">Student spotlight</span>
                  <span className="available">
                    <span /> Open to projects
                  </span>
                </div>

                <div className="profile-person">
                  <div className="person-avatar avatar-purple">A</div>
                  <div>
                    <h3>Alex Morgan</h3>
                    <p>Computer Science · Year 3</p>
                  </div>
                </div>

                <p className="profile-bio">
                  “I love turning practical ideas into products people can
                  use. Looking for curious people to build with.”
                </p>

                <div className="profile-divider" />
                <p className="mini-label">Skills they bring</p>

                <div className="profile-skills">
                  <span>React</span>
                  <span>Java</span>
                  <span>UI Design</span>
                </div>

                <div className="looking-for">
                  <span className="looking-icon">✳</span>
                  <div>
                    <p>Looking to build</p>
                    <strong>A useful campus app</strong>
                  </div>
                  <span className="looking-arrow">↗</span>
                </div>
              </div>

              <div className="floating-note">
                <span className="note-icon">♡</span>
                <div>
                  <strong>Skills meet ideas.</strong>
                  <p>That's where it starts.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="interest-strip" aria-label="Project interests">
            <p>There's room for every kind of idea</p>
            <div className="interest-list">
              {CATEGORIES.map((item) => (
                <button
                  key={item.key}
                  className="interest-item"
                  onClick={() => {
                    setCategory(item.key);
                    scrollTo('projects');
                  }}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="projects-section page-width" id="projects">
            <div className="section-heading">
              <div>
                <p className="eyebrow">A place to start</p>
                <h2>Ideas looking for a team.</h2>
                <p className="section-description">
                  Browse projects, filter by what you're good at, and ask to
                  join. Or post your own idea and let teammates come to you.
                </p>
              </div>
              <button
                className="button-primary"
                onClick={() => setModal('post')}
              >
                Post a project +
              </button>
            </div>

            <div className="toolbar">
              <input
                className="search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, skill or name…"
                aria-label="Search projects"
              />

              <div className="chips" role="group" aria-label="Filter by category">
                <button
                  className={`chip ${category === 'all' ? 'active' : ''}`}
                  onClick={() => setCategory('all')}
                >
                  All
                </button>

                {CATEGORIES.map((item) => (
                  <button
                    key={item.key}
                    className={`chip ${
                      category === item.key ? 'active' : ''
                    }`}
                    onClick={() => setCategory(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {projectsLoading && (
              <p className="result-count">Loading projects…</p>
            )}
            {projectsError && (
              <p className="field-error">{projectsError}</p>
            )}

            <p className="result-count">
              {filteredProjects.length}{' '}
              {filteredProjects.length === 1 ? 'project' : 'projects'} found
            </p>

            {filteredProjects.length ? (
              <div className="project-grid">
                {filteredProjects.map((p) => {
                  const cat = categoryOf(p.category);
                  const requested = requestedIds.some(
                    (id) => Number(id) === Number(p.id)
                  );

                  return (
                    <article className="project-card" key={p.id}>
                      <div className="project-card-top">
                        <div className={`project-symbol ${cat.color}`}>
                          {cat.icon}
                        </div>
                        <span className="project-owner">by {p.owner}</span>
                      </div>

                      <p className="project-category">{cat.label}</p>
                      <h3>{p.title}</h3>
                      <p className="project-description">{p.description}</p>

                      <div className="skills-list">
                        {(p.skills || []).map((s) => (
                          <span key={s}>{s}</span>
                        ))}
                      </div>

                      {/* NEW MATCHING SECTION */}
                      <div className="project-matching">
                        <button
                          type="button"
                          className="button-secondary"
                          onClick={() => findMatches(p.id)}
                          disabled={matchingProjectId === p.id}
                        >
                          {matchingProjectId === p.id
                            ? 'Finding matches...'
                            : 'Find matches ✨'}
                        </button>

                        {matchErrors[p.id] && (
                          <p className="field-error" role="alert">
                            {matchErrors[p.id]}
                          </p>
                        )}

                        {matchResults[p.id] !== undefined && (
                          <MatchResults result={matchResults[p.id]} />
                        )}
                      </div>

                      <div className="project-card-bottom">
                        <span className="team-dot" />
                        <span>
                          {p.needed}{' '}
                          {p.needed === 1 ? 'teammate' : 'teammates'} wanted
                          {p.requests?.length > 0 &&
                            ` · ${p.requests.length} requested`}
                        </span>
                        <button
                          className="join-button"
                          disabled={requested}
                          onClick={() => setModal({ type: 'join', project: p })}
                        >
                          {requested ? 'Requested ✓' : 'Request to join'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : !projectsLoading ? (
              <div className="empty">
                <h3>No projects match yet.</h3>
                <p>Try a different skill or category, or post your own idea.</p>
                <div className="empty-actions">
                  <button className="button-secondary" onClick={resetFilters}>
                    Clear filters
                  </button>
                  <button
                    className="button-primary"
                    onClick={() => setModal('post')}
                  >
                    Post a project
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="students-section page-width" id="students">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Meet the builders</p>
                <h2>Students open to projects.</h2>
                <p className="section-description">
                  Looking for someone who knows React, embedded systems or
                  design? Search by skill and say hello.
                </p>
              </div>
              <button
                className="button-secondary"
                onClick={() => setModal('profile')}
              >
                Add your profile
              </button>
            </div>

            <div className="toolbar">
              <input
                className="search"
                type="search"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Search by skill, name or course…"
                aria-label="Search students"
              />
            </div>

            {studentsLoading && (
              <p className="result-count">Loading students…</p>
            )}
            {studentsError && (
              <p className="field-error">{studentsError}</p>
            )}

            {filteredStudents.length ? (
              <div className="students-grid">
                {filteredStudents.map((s) => (
                  <article className="student-card" key={s.id}>
                    <div className="profile-person">
                      <div className="person-avatar avatar-purple">
                        {s.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <h3>{s.name}</h3>
                        <p>{s.course}</p>
                      </div>
                    </div>

                    <div className="profile-skills">
                      {(s.skills || []).map((skill) => (
                        <span key={skill}>{skill}</span>
                      ))}
                    </div>

                    <p className="student-goal">
                      <span>Wants to build</span>
                      {s.goal}
                    </p>
                  </article>
                ))}
              </div>
            ) : !studentsLoading ? (
              <div className="empty">
                <h3>No students match that search.</h3>
                <p>Try another skill, or add your profile.</p>
              </div>
            ) : null}
          </section>

          <section className="how-section" id="how-it-works">
            <div className="page-width">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Simple by design</p>
                  <h2>From “what if?” to “we did it.”</h2>
                </div>
                <p className="section-description how-intro">
                  No need to have everything figured out. Just bring your
                  curiosity and take the first step.
                </p>
              </div>

              <div className="steps-grid">
                <article className="step-card">
                  <span className="step-number">1</span>
                  <div className="step-icon">◎</div>
                  <h3>Show what you're into</h3>
                  <p>
                    Add your profile with your skills, interests, and the
                    projects you'd love to work on.
                  </p>
                </article>

                <article className="step-card">
                  <span className="step-number">2</span>
                  <div className="step-icon">⌕</div>
                  <h3>Find your kind of people</h3>
                  <p>
                    Search projects and students by skill, then request to
                    join the ones that fit.
                  </p>
                </article>

                <article className="step-card">
                  <span className="step-number">3</span>
                  <div className="step-icon">↗</div>
                  <h3>Make something real</h3>
                  <p>
                    Connect, plan your next steps, and turn a shared idea into
                    a project.
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className="join-section page-width" id="join">
            <div className="join-content">
              <p className="eyebrow">Your next chapter starts here</p>
              <h2>
                You bring the curiosity.
                <br />
                We'll help you find the team.
              </h2>
              <p>
                Whether you have a big idea or just want to learn by building,
                there's a place for you here.
              </p>
              <button
                className="button-primary"
                onClick={() => setModal('profile')}
              >
                Create your profile ↗
              </button>
            </div>

            <div className="join-decoration" aria-hidden="true">
              <span className="join-star">✳</span>
              <span className="join-circle">
                P<span>U</span>
              </span>
              <span className="join-spark">✦</span>
            </div>
          </section>
        </main>
      )}

      <footer className="footer page-width">
        <a className="brand" href="#home">
          partner<span>up.</span>
        </a>
        <p>Made for students who want to make things happen.</p>
        <a href="#home" className="back-top">
          Back to top ↑
        </a>
      </footer>

      {modal === 'post' && (
        <Modal title="Post a project" onClose={closeModal}>
          <PostProjectForm
            initialName={currentProfile?.name || ''}
            onSubmit={addProject}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {modal === 'profile' && (
        <Modal
          title={currentProfile ? 'Edit your profile' : 'Create your profile'}
          onClose={closeModal}
        >
          <ProfileForm
            initialProfile={currentProfile}
            onSubmit={addStudent}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {modal?.type === 'join' && (
        <Modal title="Request to join" onClose={closeModal}>
          <JoinForm
            project={modal.project}
            onSubmit={(request) => sendJoinRequest(modal.project, request)}
            onCancel={closeModal}
          />
        </Modal>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export default App;