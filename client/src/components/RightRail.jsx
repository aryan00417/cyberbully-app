import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const CATEGORY_LABEL = {
  religion: "Religion",
  age: "Age",
  gender: "Gender",
  ethnicity: "Ethnicity",
  harassment_other: "Harassment",
  none: "None",
};
const LANGUAGE_LABEL = {
  english: "English",
  hindi: "Hindi (Devanagari script)",
  hinglish: "Hinglish (Hindi in English letters)",
};

const EXAMPLES = [
  "have a great day",
  "go back to your country, you dont belong here",
  "mai tumhe jaan se maar dunga",
    "तुम बेवकूफ हो",
];

function Card({ title, children }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <h3 className="font-bold text-gray-900 mb-3">{title}</h3>
      {children}
    </section>
  );
}

function SafetyCard() {
  const { user } = useAuth();
  const max = user.maxStrikes || 3;
  const strikes = user.strikes || 0;

  if (user.role === "admin") {
    return (
      <Card title="Your account">
        <p className="text-sm text-gray-600">
          Admin account. Strikes don't apply to you, and you can manage users from the Dashboard.
        </p>
      </Card>
    );
  }

  return (
    <Card title="Your safety status">
      <div className="flex gap-1.5 mb-2">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full ${
              i < strikes ? (strikes >= max - 1 ? "bg-red-500" : "bg-amber-400") : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className="text-sm text-gray-600">
        {strikes === 0
          ? "No warnings. Keep it respectful."
          : `${strikes} of ${max} warnings used. At ${max}, your account is banned.`}
      </p>
    </Card>
  );
}

function ModerationTester() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function run(value) {
    const input = (value ?? text).trim();
    if (!input) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const { data } = await api.post("/moderate/preview", { text: input });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not reach the moderation service");
    } finally {
      setLoading(false);
    }
  }

  const pct = result ? Math.round((result.confidence || 0) * 100) : 0;
  // const localPct = result?.local ? Math.round((result.local.confidence || 0) * 100) : 0;

  return (
    <Card title="Try the moderator">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run();
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 300))}
          placeholder="Type a sentence to check. Nothing is saved."
          rows={2}
          className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 resize-none"
        />
        <div className="flex flex-wrap gap-1.5 my-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setText(ex);
                run(ex);
              }}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-full transition"
            >
              {ex.length > 24 ? ex.slice(0, 24) + "..." : ex}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="w-full bg-blue-600 text-white text-sm font-semibold rounded-full py-1.5 disabled:opacity-40 hover:bg-blue-700 transition"
        >
          {loading ? "Checking..." : "Check"}
        </button>
      </form>

      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

      {result && (
        <div className="mt-3 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                result.flagged ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
              }`}
            >
              {result.flagged ? "Flagged" : "Looks fine"}
            </span>
            {result.flagged && (
              <span className="text-gray-600">{CATEGORY_LABEL[result.category] || result.category}</span>
            )}
            <span className="ml-auto text-xs text-gray-400">{result.ms} ms</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          {/* <p className="text-xs text-gray-500">
            Confidence {pct}%. Decided by{" "}
            {result.source === "custom-model" ? "our DistilBERT model" : "the OpenRouter LLM"}.
          </p> */}
          {/* {result.source === "openrouter" && result.local && (
            <p className="text-xs text-gray-500">
              Local model said {result.local.flagged ? "flagged" : "clean"} ({localPct}%), so the LLM
              double-checked.
            </p>
          )} */}
        </div>
      )}
    </Card>
  );
}

function CommunityStats({ refreshKey }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get("/stats/public")
        .then((res) => alive && setData(res.data))
        .catch(() => {});
    load();
    const timer = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refreshKey]);

  if (!data) {
    return (
      <Card title="Community safety">
        <p className="text-sm text-gray-400">Loading...</p>
      </Card>
    );
  }

  const max = Math.max(1, ...data.byCategory.map((c) => c.count));

  return (
    <Card title="Community safety">
      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <div className="text-xl font-bold">{data.total}</div>
          <div className="text-xs text-gray-500">Checked</div>
        </div>
        <div>
          <div className="text-xl font-bold">{data.flagged}</div>
          <div className="text-xs text-gray-500">Flagged</div>
        </div>
        <div>
          <div className="text-xl font-bold">{data.flaggedPercent}%</div>
          <div className="text-xs text-gray-500">Flag rate</div>
        </div>
      </div>
      {data.byCategory.length === 0 ? (
        <p className="text-xs text-gray-400">Nothing flagged yet.</p>
      ) : (
        <div className="space-y-2">
          {data.byCategory.map((c) => (
            <div key={c.category}>
              <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                <span>{CATEGORY_LABEL[c.category] || c.category}</span>
                <span>{c.count}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${(c.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}


function HowItWorks() {
  const steps = [
    "Every post and reply is automatically analyzed for potentially harmful content.",
    "Content that needs further review receives additional context-aware analysis.",
    "Flagged content is blurred, and repeat violations can lead to warnings and account suspension.",
  ];

  return (
    <Card title="How moderation works">
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-gray-600">
            <span className="w-6 h-6 shrink-0 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function RightRail({ refreshKey }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <Card title="Join Pulse">
        <p className="text-sm text-gray-600 mb-3">
          Log in to post, reply, and try the live moderation checker.
        </p>
        <div className="flex gap-2">
          <Link to="/login" className="flex-1 text-center border border-gray-300 rounded-full py-1.5 text-sm font-medium hover:bg-gray-50 transition">
            Log in
          </Link>
          <Link to="/signup" className="flex-1 text-center bg-blue-600 text-white rounded-full py-1.5 text-sm font-semibold hover:bg-blue-700 transition">
            Sign up
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <>
      <SafetyCard />
      <ModerationTester />
      <CommunityStats refreshKey={refreshKey} />
      <HowItWorks />
    </>
  );
}