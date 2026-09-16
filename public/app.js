const state = {
  options: null,
  categoryIndex: new Map(),
  jobs: [],
  jobDateFilter: "",
  currentJob: null,
  events: [],
  leads: [],
  filter: "all",
  platformFilter: "all",
  leadSearchTerm: "",
  eventSource: null,
  summaryLeadId: ""
};

const UI_TEXT = {
  unspecified: "\u4e0d\u6307\u5b9a",
  requestFailed: "\u8bf7\u6c42\u5931\u8d25",
  waiting: "\u7b49\u5f85\u53d1\u8d77\u4efb\u52a1",
  noJobSelected: "\u5c1a\u672a\u9009\u62e9\u4efb\u52a1",
  noPlan: "\u4efb\u52a1\u521b\u5efa\u540e\uff0c\u8fd9\u91cc\u4f1a\u663e\u793a query \u8ba1\u5212\u3002",
  noPlanCurrent: "\u5f53\u524d\u4efb\u52a1\u6682\u65e0 query \u8ba1\u5212\u3002",
  noEvents: "\u4efb\u52a1\u542f\u52a8\u540e\uff0c\u8fd9\u91cc\u4f1a\u6301\u7eed\u5c55\u793a\u7ed3\u6784\u5316\u8fdb\u5ea6\u3002",
  noLeads: "\u8fd8\u6ca1\u6709\u7ed3\u679c\uff0c\u5148\u53d1\u8d77\u4e00\u6b21\u641c\u7d22\u3002",
  noFilteredLeads: "\u5f53\u524d\u7b5b\u9009\u6761\u4ef6\u4e0b\u6ca1\u6709\u7ebf\u7d22\u3002",
  noRecentJobs: "\u8fd8\u6ca1\u6709\u5386\u53f2\u4efb\u52a1\uff0c\u53d1\u8d77\u4e00\u6b21\u641c\u7d22\u540e\u4f1a\u6c89\u6dc0\u5728\u8fd9\u91cc\u3002",
  noRecentJobsCard: "\u6682\u65e0\u4efb\u52a1\u8bb0\u5f55",
  recentJobsSummary: (count) => `\u6700\u8fd1 ${count} \u4e2a\u4efb\u52a1\uff0c\u70b9\u51fb\u53ef\u4ee5\u91cd\u65b0\u67e5\u770b\u8be6\u60c5\u3002`,
  filteredJobsSummary: (visible, total, dateLabel) =>
    dateLabel
      ? `\u5f53\u524d\u5c55\u793a ${visible} / ${total} \u4e2a\u4efb\u52a1\uff0c\u65e5\u671f\u7b5b\u9009\uff1a${dateLabel}\u3002`
      : `\u5f53\u524d\u5c55\u793a ${visible} / ${total} \u4e2a\u4efb\u52a1\uff0c\u65e5\u671f\u53ef\u9009\u3002`,
  noRecentJobsForDate: "\u8be5\u65e5\u671f\u4e0b\u6682\u65e0\u4efb\u52a1\u3002",
  filteredLeadSummary: (visible, total, refined, broad) =>
    `\u5f53\u524d\u5c55\u793a ${visible} / ${total} \u6761\uff0c\u7cbe\u7b5b ${refined}\uff0c\u5bbd\u7b5b ${broad}\u3002`,
  copiedPhone: (phone) => `\u5df2\u590d\u5236\u624b\u673a\u53f7 ${phone}`,
  copyFailed: "\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u6d4f\u89c8\u5668\u526a\u8d34\u677f\u6743\u9650\u3002",
  streamDisconnected: "\u5b9e\u65f6\u8fde\u63a5\u4e2d\u65ad\uff0c\u53ef\u70b9\u51fb\u5237\u65b0\u6216\u91cd\u65b0\u6253\u5f00\u4efb\u52a1\u3002",
  idleStatus: "\u5f85\u542f\u52a8",
  leadDetail: "\u7ebf\u7d22\u8be6\u60c5",
  noSummary: "\u6682\u65e0\u6458\u8981",
  noMatchedQueries: "\u6682\u65e0\u547d\u4e2d query",
  allPlatforms: "\u5168\u90e8\u5e73\u53f0",
  linkOpen: "\u6253\u5f00\u94fe\u63a5",
  copyPhoneLabel: "\u590d\u5236\u53f7\u7801",
  viewSummaryLabel: "\u67e5\u770b\u6458\u8981",
  noLink: "\u65e0\u94fe\u63a5",
  scoreLabel: {
    high: "\u9ad8\u53ef\u4fe1",
    medium: "\u9700\u590d\u6838",
    low: "\u4f4e\u53ef\u4fe1"
  },
  qualityFactorLabel: {
    phone_code: "\u533a\u53f7\u5339\u914d",
    phone_code_mismatch: "\u533a\u53f7\u4e0d\u5339\u914d",
    business_signal: "\u4e1a\u52a1\u8bcd\u547d\u4e2d",
    industry_signal: "\u884c\u4e1a\u8bcd\u547d\u4e2d",
    category_signal: "\u7c7b\u76ee\u547d\u4e2d",
    supplier_signal: "\u4f9b\u5e94\u5546\u4fe1\u53f7",
    importer_signal: "\u8fdb\u53e3\u5546\u4fe1\u53f7",
    china_signal: "\u4e2d\u56fd\u4e1a\u52a1\u4fe1\u53f7",
    search_rank: "\u641c\u7d22\u6392\u540d",
    noise_signal: "\u566a\u58f0\u8bcd\u547d\u4e2d"
  },
  tierLabel: {
    refined: "\u7cbe\u7b5b",
    broad: "\u5bbd\u7b5b",
    unknown: "\u672a\u5206\u5c42"
  },
  previewModeBrave: "Brave\uff1a\u9759\u6001\u9884\u89c8",
  previewModeSupabase: "Supabase\uff1a\u9759\u6001\u9884\u89c8",
  previewHint:
    "\u5f53\u524d\u662f file:// \u9759\u6001\u9884\u89c8\uff0c\u4efb\u52a1\u548c\u63a5\u53e3\u529f\u80fd\u9700\u8981\u901a\u8fc7 http://localhost:3000 \u6253\u5f00\u3002",
  leadFilterHint: "\u652f\u6301\u6309\u8d28\u91cf\u5c42\u7ea7\u3001\u5e73\u53f0\u548c\u5173\u952e\u8bcd\u7ee7\u7eed\u7b5b\u9009\u3002",
  status: {
    pending: "\u5f85\u6267\u884c",
    running: "\u6267\u884c\u4e2d",
    completed: "\u5df2\u5b8c\u6210",
    completed_with_warnings: "\u5b8c\u6210\u4f46\u6709\u544a\u8b66",
    failed: "\u5931\u8d25",
    cancelled: "\u5df2\u53d6\u6d88",
    unknown: "\u672a\u77e5"
  }
};

const searchForm = document.getElementById("searchForm");
const searchButton = document.getElementById("searchButton");
const cancelButton = document.getElementById("cancelButton");
const reloadJobsButton = document.getElementById("reloadJobsButton");
const platformOptions = document.getElementById("platformOptions");
const industrySelect = document.getElementById("industrySelect");
const poolTypeSelect = document.getElementById("poolTypeSelect");
const categoryLevel1Select = document.getElementById("categoryLevel1Select");
const categoryLevel2Select = document.getElementById("categoryLevel2Select");
const categoryLevel3Select = document.getElementById("categoryLevel3Select");
const categoryHint = document.getElementById("categoryHint");
const countrySelect = document.getElementById("countrySelect");
const cityPicker = document.getElementById("cityPicker");
const citySummary = document.getElementById("citySummary");
const cityOptions = document.getElementById("cityOptions");
const jobList = document.getElementById("jobList");
const jobsSummary = document.getElementById("jobsSummary");
const jobDateFilterInput = document.getElementById("jobDateFilter");
const braveStatus = document.getElementById("braveStatus");
const supabaseStatus = document.getElementById("supabaseStatus");
const jobTitle = document.getElementById("jobTitle");
const jobMeta = document.getElementById("jobMeta");
const jobStatus = document.getElementById("jobStatus");
const queryProgress = document.getElementById("queryProgress");
const leadCount = document.getElementById("leadCount");
const refinedCount = document.getElementById("refinedCount");
const progressFill = document.getElementById("progressFill");
const queryList = document.getElementById("queryList");
const eventList = document.getElementById("eventList");
const leadSummary = document.getElementById("leadSummary");
const leadSearchInput = document.getElementById("leadSearchInput");
const platformFilterSelect = document.getElementById("platformFilterSelect");
const leadTableBody = document.getElementById("leadTableBody");
const exportAllLink = document.getElementById("exportAllLink");
const exportRefinedLink = document.getElementById("exportRefinedLink");
const summaryModal = document.getElementById("summaryModal");
const closeSummaryButton = document.getElementById("closeSummaryButton");
const summaryTitle = document.getElementById("summaryTitle");
const summaryMeta = document.getElementById("summaryMeta");
const summaryBody = document.getElementById("summaryBody");
const summaryQueries = document.getElementById("summaryQueries");
const summaryQuality = document.getElementById("summaryQuality");
const summaryRaw = document.getElementById("summaryRaw");
const summaryLink = document.getElementById("summaryLink");
const queryEstimate = document.getElementById("queryEstimate");
const formMessage = document.getElementById("formMessage");

boot().catch((error) => {
  pushEvent({
    type: "ui.error",
    message: error.message
  });
});

searchForm.addEventListener("submit", handleSubmit);
searchForm.addEventListener("input", renderQueryEstimate);
searchForm.addEventListener("change", renderQueryEstimate);
cancelButton.addEventListener("click", handleCancel);
reloadJobsButton.addEventListener("click", handleReloadJobs);
jobList.addEventListener("click", handleJobSelect);
jobDateFilterInput.addEventListener("change", () => {
  state.jobDateFilter = jobDateFilterInput.value;
  renderRecentJobs();
});
leadTableBody.addEventListener("click", handleLeadAction);
leadSearchInput.addEventListener("input", () => {
  state.leadSearchTerm = leadSearchInput.value.trim().toLowerCase();
  renderLeads();
});
platformFilterSelect.addEventListener("change", () => {
  state.platformFilter = platformFilterSelect.value;
  renderLeads();
});
cityOptions.addEventListener("change", (event) => {
  if (event.target.matches('input[name="cities"]')) {
    updateCitySummary();
    renderQueryEstimate();
  }
});
cityOptions.addEventListener("click", handleCityAction);
closeSummaryButton.addEventListener("click", closeSummary);
summaryModal.addEventListener("click", (event) => {
  if (event.target === summaryModal) {
    closeSummary();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !summaryModal.classList.contains("hidden")) {
    closeSummary();
  }
});

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    syncFilterChips();
    renderLeads();
  });
});

const countryInput = searchForm.elements.namedItem("country");
if (countryInput) {
  countryInput.addEventListener("change", handleCountryPreset);
}
industrySelect.addEventListener("change", () => {
  industrySelect.dataset.autoDerived = "false";
});
categoryLevel1Select.addEventListener("change", handleCategoryLevel1Change);
categoryLevel2Select.addEventListener("change", handleCategoryLevel2Change);
categoryLevel3Select.addEventListener("change", handleCategoryLevel3Change);

async function boot() {
  renderRecentJobs();
  renderJob();
  renderEvents();
  renderLeads();
  renderQueryEstimate();

  if (window.location.protocol === "file:") {
    braveStatus.textContent = UI_TEXT.previewModeBrave;
    supabaseStatus.textContent = UI_TEXT.previewModeSupabase;
    jobsSummary.textContent = UI_TEXT.previewHint;
    pushEvent({
      type: "ui.preview",
      message: UI_TEXT.previewHint
    });
    return;
  }

  const [optionsPayload, healthPayload, jobsPayload] = await Promise.all([
    fetchJson("/api/options"),
    fetchJson("/api/health"),
    fetchJson("/api/jobs?limit=12")
  ]);

  state.options = optionsPayload;
  hydrateOptions(optionsPayload);
  renderHealth(healthPayload);
  state.jobs = jobsPayload.jobs || [];
  renderRecentJobs();

  if (state.jobs[0]) {
    await openJob(state.jobs[0].id, {
      skipJobListRefresh: true
    });
  }
}

function hydrateOptions(optionsPayload) {
  industrySelect.innerHTML = `<option value="">${UI_TEXT.unspecified}</option>${optionsPayload.industries
    .map((industry) => `<option value="${industry.id}">${escapeHtml(industry.label)}</option>`)
    .join("")}`;

  poolTypeSelect.innerHTML = optionsPayload.poolTypes
    .map((poolType) => `<option value="${poolType.id}">${escapeHtml(poolType.label)}</option>`)
    .join("");

  platformOptions.innerHTML = optionsPayload.platforms
    .map((platform) => {
      return `
        <label class="platform-option">
          <input type="checkbox" name="platforms" value="${platform.id}" checked />
          <span>${escapeHtml(platform.label)}</span>
        </label>
      `;
    })
    .join("");

  countrySelect.innerHTML = [
    `<option value="">\u8bf7\u9009\u62e9\u56fd\u5bb6</option>`,
    ...optionsPayload.countries.map((country) => {
      const label = `${country.chineseName} \u00b7 ${country.countryCode} \u00b7 ${country.defaultPhoneCode}`;
      return `<option value="${escapeHtml(country.country)}">${escapeHtml(label)}</option>`;
    })
  ].join("");
  hydrateCategoryTaxonomy(optionsPayload.categoryTaxonomy || []);
  renderQueryEstimate();
}

function renderHealth(healthPayload) {
  renderProviderStatus(
    braveStatus,
    "Brave",
    healthPayload.providers?.brave || {
      configured: healthPayload.braveConfigured,
      state: healthPayload.braveConfigured ? "configured" : "missing"
    }
  );
  renderProviderStatus(
    supabaseStatus,
    "Supabase",
    healthPayload.providers?.supabase || {
      configured: healthPayload.supabaseConfigured,
      state: healthPayload.supabaseConfigured ? "configured" : "missing"
    }
  );
}

async function handleSubmit(event) {
  event.preventDefault();
  searchButton.disabled = true;
  searchButton.textContent = "\u521b\u5efa\u4efb\u52a1...";
  clearFormMessage();

  try {
    const payload = collectFormPayload();
    const { job } = await fetchJson("/api/jobs", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    state.currentJob = job;
    state.events = [];
    state.leads = [];
    state.filter = "all";
    state.platformFilter = "all";
    state.leadSearchTerm = "";
    state.summaryLeadId = "";
    leadSearchInput.value = "";
    platformFilterSelect.value = "all";
    syncFilterChips();
    closeStream();
    upsertRecentJob(job);
    renderJob(job);
    renderEvents();
    renderLeads();
    bindExportLinks(job.id);
    startStream(job.id);
    await refreshJobData(job.id);
    await loadJobs();
    showFormMessage("\u4efb\u52a1\u5df2\u521b\u5efa\uff0c\u6b63\u5728\u6267\u884c\u641c\u7d22\u8ba1\u5212\u3002", "success");
  } catch (error) {
    showFormMessage(error.message, "error");
    pushEvent({
      type: "ui.error",
      message: error.message
    });
  } finally {
    searchButton.disabled = false;
    searchButton.textContent = "\u5f00\u59cb\u6293\u53d6";
  }
}

async function handleCancel() {
  if (!state.currentJob) {
    return;
  }

  cancelButton.disabled = true;
  try {
    await fetchJson(`/api/jobs/${state.currentJob.id}/cancel`, {
      method: "POST"
    });
    await refreshJobData(state.currentJob.id);
    await loadJobs();
  } catch (error) {
    showFormMessage(error.message, "error");
    pushEvent({
      type: "ui.error",
      message: error.message
    });
  }
}

async function handleReloadJobs() {
  reloadJobsButton.disabled = true;
  try {
    await loadJobs();
    if (state.currentJob?.id) {
      await refreshJobData(state.currentJob.id);
    }
  } catch (error) {
    showFormMessage(error.message, "error");
    pushEvent({
      type: "ui.error",
      message: error.message
    });
  } finally {
    reloadJobsButton.disabled = false;
  }
}

async function handleJobSelect(event) {
  const button = event.target.closest("[data-job-id]");
  if (!button) {
    return;
  }

  const { jobId } = button.dataset;
  if (!jobId || jobId === state.currentJob?.id) {
    return;
  }

  try {
    await openJob(jobId, {
      skipJobListRefresh: true
    });
  } catch (error) {
    pushEvent({
      type: "ui.error",
      message: error.message
    });
  }
}

async function handleLeadAction(event) {
  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const { leadId, action } = actionButton.dataset;
  const lead = state.leads.find((item) => item.id === leadId);
  if (!lead) {
    return;
  }

  if (action === "copy-phone") {
    try {
      await navigator.clipboard.writeText(lead.phone || "");
      pushEvent({
        type: "ui.copy",
        message: UI_TEXT.copiedPhone(lead.phone || "")
      });
    } catch {
      pushEvent({
        type: "ui.copy",
        message: UI_TEXT.copyFailed
      });
    }
    return;
  }

  if (action === "view-summary") {
    openSummary(lead);
  }
}

function collectFormPayload() {
  const formData = new FormData(searchForm);
  const platforms = formData.getAll("platforms");

  return {
    searchTerm: formData.get("searchTerm"),
    phoneCode: formData.get("phoneCode"),
    country: formData.get("country"),
    cities: formData.getAll("cities"),
    industryGroup: formData.get("industryGroup"),
    categoryLevel1: formData.get("categoryLevel1"),
    categoryLevel2: formData.get("categoryLevel2"),
    categoryLevel3: formData.get("categoryLevel3"),
    poolType: formData.get("poolType"),
    searchLanguage: formData.get("searchLanguage"),
    braveCountry: formData.get("braveCountry"),
    maxQueries: Number(formData.get("maxQueries")),
    platforms
  };
}

async function loadJobs() {
  const payload = await fetchJson("/api/jobs?limit=12");
  state.jobs = payload.jobs || [];
  renderRecentJobs();
}

async function openJob(jobId, { skipJobListRefresh = false } = {}) {
  closeStream();
  await refreshJobData(jobId);

  if (!skipJobListRefresh) {
    await loadJobs();
  }

  if (state.currentJob && !isTerminalStatus(state.currentJob.status)) {
    startStream(jobId);
  }
}

function startStream(jobId) {
  closeStream();
  const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);
  state.eventSource = eventSource;

  eventSource.onmessage = async (event) => {
    const payload = JSON.parse(event.data);

    if (payload.kind === "job") {
      state.currentJob = payload.job;
      upsertRecentJob(payload.job);
      renderJob(payload.job);

      if (isTerminalStatus(payload.job.status)) {
        closeStream();
        await refreshJobData(jobId);
        await loadJobs();
      }
      return;
    }

    if (payload.kind === "event") {
      state.events.push(payload.event);
      renderEvents();
      return;
    }

    if (payload.kind === "lead") {
      upsertLead(payload.lead);
      renderLeads();
    }
  };

  eventSource.onerror = () => {
    if (state.currentJob?.id === jobId && !isTerminalStatus(state.currentJob.status)) {
      pushEvent({
        type: "stream.warning",
        message: UI_TEXT.streamDisconnected
      });
    }
    closeStream();
  };
}

function closeStream() {
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
}

async function refreshJobData(jobId) {
  const [jobPayload, eventsPayload, leadsPayload] = await Promise.all([
    fetchJson(`/api/jobs/${jobId}`),
    fetchJson(`/api/jobs/${jobId}/events`),
    fetchJson(`/api/jobs/${jobId}/leads`)
  ]);

  state.currentJob = jobPayload.job;
  state.events = eventsPayload.events || [];
  state.leads = leadsPayload.leads || [];
  upsertRecentJob(jobPayload.job);
  renderJob(state.currentJob);
  renderEvents();
  renderLeads();
}

function renderRecentJobs() {
  if (!state.jobs.length) {
    jobsSummary.textContent = UI_TEXT.noRecentJobs;
    jobList.innerHTML = `<div class="empty-card">${UI_TEXT.noRecentJobsCard}</div>`;
    return;
  }

  const visibleJobs = getVisibleJobs();
  const dateLabel = state.jobDateFilter ? formatDateLabel(state.jobDateFilter) : "";
  jobsSummary.textContent = state.jobDateFilter
    ? UI_TEXT.filteredJobsSummary(visibleJobs.length, state.jobs.length, dateLabel)
    : UI_TEXT.recentJobsSummary(state.jobs.length);

  if (!visibleJobs.length) {
    jobList.innerHTML = `<div class="empty-card">${UI_TEXT.noRecentJobsForDate}</div>`;
    return;
  }

  jobList.innerHTML = visibleJobs
    .map((job) => {
      const activeClass = job.id === state.currentJob?.id ? " active" : "";
      const location = [job.country, job.city].filter(Boolean).join(" / ");
      const platforms = (job.platforms || [])
        .map((platformId) => state.options?.platforms?.find((item) => item.id === platformId)?.label || platformId)
        .join(" + ");
      const categoryLabel = job.categorySelection?.displayLabel || job.inputPayload?.categorySelection?.displayLabel || "";

      return `
        <button type="button" class="task-row${activeClass}" data-job-id="${job.id}">
          <div class="task-row-main">
            <div class="task-row-titleline">
              <strong>${escapeHtml(job.searchTerm || "\u672a\u547d\u540d\u4efb\u52a1")}</strong>
              <span class="status-badge ${statusTone(job.status)}">${escapeHtml(humanizeStatus(job.status))}</span>
            </div>
            <p>${escapeHtml([location, platforms, categoryLabel].filter(Boolean).join(" | ") || job.phoneCode || "")}</p>
          </div>
          <div class="task-row-meta">
            <span>${escapeHtml(job.phoneCode || "-")}</span>
            <span>${escapeHtml(formatDateTime(job.createdAt))}</span>
            <span>\u7ebf\u7d22 ${job.savedLeads || 0}</span>
            <span>\u7cbe\u7b5b ${job.refinedLeads || 0}</span>
            <span>\u67e5\u8be2 ${job.completedQueries || 0}/${job.totalQueries || 0}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderJob(job = state.currentJob) {
  if (!job) {
    jobTitle.textContent = UI_TEXT.waiting;
    jobMeta.innerHTML = `<span class="pill">${UI_TEXT.noJobSelected}</span>`;
    jobStatus.textContent = UI_TEXT.idleStatus;
    queryProgress.textContent = "0 / 0";
    leadCount.textContent = "0";
    refinedCount.textContent = "0";
    progressFill.style.width = "0%";
    queryList.innerHTML = `<li>${UI_TEXT.noPlan}</li>`;
    cancelButton.disabled = true;
    bindExportLinks("");
    return;
  }

  const percent = job.progress?.percent ?? 0;
  const jobPlatforms = (job.platforms || [])
    .map((platformId) => state.options?.platforms?.find((item) => item.id === platformId)?.label || platformId)
    .join(" + ");
  const metaParts = [
    `\u4efb\u52a1ID ${job.id.slice(0, 8)}`,
    job.country || "",
    job.city || "",
    job.phoneCode || "",
    job.categorySelection?.displayLabel || job.inputPayload?.categorySelection?.displayLabel || "",
    jobPlatforms,
    formatDateTime(job.createdAt)
  ].filter(Boolean);
  const errorMeta = job.lastError
    ? `<span class="pill error-pill">${escapeHtml(job.lastError)}</span>`
    : "";

  jobTitle.textContent = job.searchTerm || "\u672a\u547d\u540d\u4efb\u52a1";
  jobMeta.innerHTML = `${metaParts.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}${errorMeta}`;
  jobStatus.textContent = humanizeStatus(job.status);
  queryProgress.textContent = `${job.completedQueries || 0} / ${job.totalQueries || 0}`;
  leadCount.textContent = String(job.savedLeads || 0);
  refinedCount.textContent = String(job.refinedLeads || 0);
  progressFill.style.width = `${percent}%`;
  cancelButton.disabled = isTerminalStatus(job.status);

  queryList.innerHTML = (job.queryPlan || [])
    .map((query) => {
      const active = job.currentQuery === query.text ? "active-query" : "";
      return `
        <li class="${active}">
          <span>${escapeHtml(query.platformId)}</span>
          <code>${escapeHtml(query.text)}</code>
        </li>
      `;
    })
    .join("");

  if (!job.queryPlan?.length) {
    queryList.innerHTML = `<li>${UI_TEXT.noPlanCurrent}</li>`;
  }

  bindExportLinks(job.id);
  renderRecentJobs();
}

function renderEvents() {
  if (!eventList) {
    return;
  }

  if (!state.events.length) {
    eventList.innerHTML = `<li class="empty-event">${UI_TEXT.noEvents}</li>`;
    return;
  }

  eventList.innerHTML = [...state.events]
    .slice(-18)
    .reverse()
    .map((item) => {
      return `
        <li>
          <div>
            <strong>${escapeHtml(item.type)}</strong>
            <p>${escapeHtml(item.message)}</p>
          </div>
          <time>${escapeHtml(formatTime(item.createdAt))}</time>
        </li>
      `;
    })
    .join("");
}

function renderLeads() {
  const visibleLeads = getVisibleLeads();
  renderPlatformFilterOptions();

  if (!state.currentJob && !state.leads.length) {
    leadSummary.textContent = UI_TEXT.leadFilterHint;
    leadTableBody.innerHTML = `<tr><td colspan="11" class="empty-cell">${UI_TEXT.noLeads}</td></tr>`;
    return;
  }

  const refined = state.leads.filter((lead) => lead.qualityTier === "refined").length;
  const broad = state.leads.filter((lead) => lead.qualityTier === "broad").length;
  leadSummary.textContent = UI_TEXT.filteredLeadSummary(visibleLeads.length, state.leads.length, refined, broad);

  if (!visibleLeads.length) {
    leadTableBody.innerHTML = `<tr><td colspan="11" class="empty-cell">${UI_TEXT.noFilteredLeads}</td></tr>`;
    return;
  }

  leadTableBody.innerHTML = visibleLeads
    .slice(0, 200)
    .map((lead) => {
      const row = toStructuredRow(lead);
      const qualityScore = getQualityScore(lead);
      return `
        <tr>
          <td data-label="\u56fd\u5bb6">${renderTableText(row.country)}</td>
          <td data-label="\u884c\u4e1a\u7ec4">${renderTableText(row.industryGroup)}</td>
          <td data-label="\u516c\u53f8/\u9875\u9762">
            <div class="company-cell">
              <strong class="cell-ellipsis" title="${escapeHtml(row.companyPage)}">${escapeHtml(row.companyPage)}</strong>
              <div class="row-badges">
                <span class="tier ${escapeHtml(lead.qualityTier || "broad")}">${escapeHtml(getTierLabel(lead.qualityTier))}</span>
                <span class="pill small">${escapeHtml(getPlatformLabel(lead.platform))}</span>
              </div>
            </div>
          </td>
          <td data-label="\u624b\u673a">${renderTableText(row.phone)}</td>
          <td data-label="\u53ef\u4fe1\u5ea6">${renderQualityScore(qualityScore, lead.confidence)}</td>
          <td data-label="\u6765\u6e90\u94fe\u63a5">${renderExternalLink(UI_TEXT.linkOpen, row.facebookLink)}</td>
          <td data-label="\u7c7b\u76ee\u82f1\u6587">${renderTableText(row.categoryEnglish)}</td>
          <td data-label="\u7c7b\u76ee\u672c\u5730\u8bed\u8a00">${renderTableText(row.categoryLocal)}</td>
          <td data-label="\u547d\u4e2d Query">${renderTableText(row.matchedQueries)}</td>
          <td data-label="\u6458\u8981" class="summary-cell">${renderTableText(row.summary)}</td>
          <td data-label="\u64cd\u4f5c">
            <div class="action-stack">
              <button
                type="button"
                class="mini-button"
                data-action="copy-phone"
                data-lead-id="${lead.id}"
                ${lead.phone ? "" : "disabled"}
              >
                ${UI_TEXT.copyPhoneLabel}
              </button>
              <button
                type="button"
                class="mini-button"
                data-action="view-summary"
                data-lead-id="${lead.id}"
              >
                ${UI_TEXT.viewSummaryLabel}
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderPlatformFilterOptions() {
  const currentValue = state.platformFilter;
  const platforms = [...new Set(state.leads.map((lead) => lead.platform).filter(Boolean))];
  platformFilterSelect.innerHTML = [
    `<option value="all">${UI_TEXT.allPlatforms}</option>`,
    ...platforms.map((platformId) => {
      return `<option value="${platformId}">${escapeHtml(getPlatformLabel(platformId))}</option>`;
    })
  ].join("");

  if (platforms.includes(currentValue) || currentValue === "all") {
    platformFilterSelect.value = currentValue;
    return;
  }

  state.platformFilter = "all";
  platformFilterSelect.value = "all";
}

function getVisibleLeads() {
  return state.leads.filter((lead) => {
    if (state.filter !== "all" && lead.qualityTier !== state.filter) {
      return false;
    }

    if (state.platformFilter !== "all" && lead.platform !== state.platformFilter) {
      return false;
    }

    if (!state.leadSearchTerm) {
      return true;
    }

    const haystack = [
      lead.title,
      lead.summary,
      lead.phone,
      lead.sourceUrl,
      lead.country,
      lead.city,
      getLeadCategoryData(lead).categoryEnglish,
      getLeadCategoryData(lead).categoryLocal,
      ...(lead.matchedKeywords || []),
      ...(lead.matchedQueries || [])
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(state.leadSearchTerm);
  });
}

function bindExportLinks(jobId) {
  if (!jobId) {
    exportAllLink.href = "#";
    exportRefinedLink.href = "#";
    exportAllLink.classList.add("disabled");
    exportRefinedLink.classList.add("disabled");
    return;
  }

  exportAllLink.href = `/api/jobs/${jobId}/export.csv`;
  exportRefinedLink.href = `/api/jobs/${jobId}/export.csv?qualityTier=refined`;
  exportAllLink.classList.remove("disabled");
  exportRefinedLink.classList.remove("disabled");
}

function upsertLead(incomingLead) {
  const index = state.leads.findIndex((lead) => lead.dedupeKey === incomingLead.dedupeKey);
  if (index === -1) {
    state.leads.unshift(incomingLead);
    return;
  }

  state.leads[index] = incomingLead;
}

function upsertRecentJob(incomingJob) {
  const index = state.jobs.findIndex((job) => job.id === incomingJob.id);
  if (index === -1) {
    state.jobs.unshift(incomingJob);
  } else {
    state.jobs[index] = incomingJob;
  }

  state.jobs = [...state.jobs]
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
    .slice(0, 12);
}

function pushEvent({ type, message }) {
  state.events.push({
    type,
    message,
    createdAt: new Date().toISOString()
  });
  renderEvents();
}

function toStructuredRow(lead) {
  const industry = state.options?.industries?.find((item) => item.id === lead.industryGroup);
  const category = getLeadCategoryData(lead);
  const platformLabel = getPlatformLabel(lead.platform);
  const location = inferDisplayLocation(lead);

  return {
    country: lead.country || "",
    industryGroup: category.industryGroup || industry?.exportGroupLabel || industry?.label || lead.industryGroup || "",
    companyPage: [lead.title, location, platformLabel].filter(Boolean).join(" | "),
    phone: lead.phone || "",
    facebookLink: lead.sourceUrl || lead.canonicalUrl || "",
    categoryEnglish: category.categoryEnglish || industry?.exportCategoryEnglish || industry?.englishLabel || lead.industryGroup || "",
    categoryLocal: category.categoryLocal || industry?.exportCategoryLocal || industry?.label || "",
    matchedQueries: (lead.matchedQueries || []).join(" || "),
    summary: lead.summary || ""
  };
}

function inferDisplayLocation(lead) {
  const title = String(lead.title || "").trim();
  const summary = String(lead.summary || "").trim();
  const alphaRange = "A-Za-z\\u00C0-\\u017F\\u4e00-\\u9fff' .-";

  const titleCityMatch = title.match(new RegExp(`,\\s*([${alphaRange}]{2,40})$`));
  if (titleCityMatch?.[1]) {
    return cleanupLocation(titleCityMatch[1]);
  }

  const summaryPipeMatch = summary.match(/\u00B7\s*([^\u00B7<>]{2,50})\s*\u00B7\s*(?:<strong>\+?\d|\+?\d|[A-Z0-9._%+-]+@)/i);
  if (summaryPipeMatch?.[1]) {
    return cleanupLocation(summaryPipeMatch[1]);
  }

  const likesCityMatch = summary.match(new RegExp(`,\\s*([${alphaRange}]{2,40})\\.\\s*\\d[\\d,.]*\\s+likes`, "i"));
  if (likesCityMatch?.[1]) {
    return cleanupLocation(likesCityMatch[1]);
  }

  return String(lead.city || "").trim();
}

function cleanupLocation(value) {
  return String(value || "")
    .replace(/Page$/i, "")
    .replace(/Automotive.*$/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();
}

function getPlatformLabel(platformId) {
  return state.options?.platforms?.find((item) => item.id === platformId)?.label || platformId || "";
}

function openSummary(lead) {
  state.summaryLeadId = lead.id;
  const row = toStructuredRow(lead);
  const category = getLeadCategoryData(lead);
  summaryTitle.textContent = lead.title || UI_TEXT.leadDetail;
  summaryMeta.innerHTML = [
    row.country,
    row.phone,
    category.categoryLocal || category.categoryEnglish,
    getPlatformLabel(lead.platform),
    humanizeStatus(state.currentJob?.status || "")
  ]
    .filter(Boolean)
    .map((item) => `<span class="pill">${escapeHtml(item)}</span>`)
    .join("");
  summaryBody.textContent = row.summary || UI_TEXT.noSummary;
  summaryQueries.textContent = (lead.matchedQueries || []).join("\n") || UI_TEXT.noMatchedQueries;
  summaryQuality.innerHTML = renderQualityBreakdown(lead);
  summaryRaw.textContent = JSON.stringify(lead.rawResult || {}, null, 2);

  if (row.facebookLink) {
    summaryLink.href = row.facebookLink;
    summaryLink.classList.remove("disabled");
  } else {
    summaryLink.href = "#";
    summaryLink.classList.add("disabled");
  }

  summaryModal.classList.remove("hidden");
}

function closeSummary() {
  state.summaryLeadId = "";
  summaryModal.classList.add("hidden");
}

function handleCountryPreset() {
  const countryValue = String(searchForm.elements.namedItem("country")?.value || "").trim();
  const preset = state.options?.countries?.find((item) => item.country === countryValue);
  const phoneCodeInput = searchForm.elements.namedItem("phoneCode");
  const searchLanguageInput = searchForm.elements.namedItem("searchLanguage");
  const braveCountryInput = searchForm.elements.namedItem("braveCountry");

  if (!preset) {
    if (phoneCodeInput) {
      phoneCodeInput.value = "";
    }
    if (searchLanguageInput) {
      searchLanguageInput.value = "";
    }
    if (braveCountryInput) {
      braveCountryInput.value = "";
    }
    renderCityOptions(null);
    renderQueryEstimate();
    return;
  }

  if (phoneCodeInput) {
    phoneCodeInput.value = preset.defaultPhoneCode || "";
  }
  if (searchLanguageInput) {
    searchLanguageInput.value = preset.defaultSearchLang || "";
  }
  if (braveCountryInput) {
    braveCountryInput.value = preset.braveCountry || "";
  }
  renderCityOptions(preset);
  clearFormMessage();
  renderQueryEstimate();
}

function hydrateCategoryTaxonomy(taxonomy) {
  state.categoryIndex = buildCategoryIndex(taxonomy);
  setCategorySelectOptions(categoryLevel1Select, taxonomy, UI_TEXT.unspecified, false);
  setCategorySelectOptions(categoryLevel2Select, [], "\u5148\u9009\u62e9\u4e00\u7ea7\u7c7b\u76ee", true);
  setCategorySelectOptions(categoryLevel3Select, [], "\u5148\u9009\u62e9\u4e8c\u7ea7\u7c7b\u76ee", true);
  renderCategoryHint();
}

function buildCategoryIndex(nodes, index = new Map()) {
  nodes.forEach((node) => {
    index.set(node.id, node);
    buildCategoryIndex(node.children || [], index);
  });
  return index;
}

function setCategorySelectOptions(selectElement, nodes, placeholder, disabled) {
  selectElement.disabled = disabled;
  selectElement.innerHTML = [
    `<option value="">${escapeHtml(placeholder)}</option>`,
    ...nodes.map((node) => {
      const label = node.localLabel && node.depth === 3
        ? `${node.localLabel} / ${node.label}`
        : node.label;
      return `<option value="${escapeHtml(node.id)}">${escapeHtml(label)}</option>`;
    })
  ].join("");
}

function handleCategoryLevel1Change() {
  const selectedLevel1 = getCategoryNodeById(categoryLevel1Select.value);
  setCategorySelectOptions(
    categoryLevel2Select,
    selectedLevel1?.children || [],
    selectedLevel1 ? UI_TEXT.unspecified : "\u5148\u9009\u62e9\u4e00\u7ea7\u7c7b\u76ee",
    !selectedLevel1
  );
  setCategorySelectOptions(categoryLevel3Select, [], "\u5148\u9009\u62e9\u4e8c\u7ea7\u7c7b\u76ee", true);
  renderCategoryHint();
  syncIndustryFromCategory();
}

function handleCategoryLevel2Change() {
  const selectedLevel2 = getCategoryNodeById(categoryLevel2Select.value);
  setCategorySelectOptions(
    categoryLevel3Select,
    selectedLevel2?.children || [],
    selectedLevel2 ? UI_TEXT.unspecified : "\u5148\u9009\u62e9\u4e8c\u7ea7\u7c7b\u76ee",
    !selectedLevel2
  );
  renderCategoryHint();
  syncIndustryFromCategory();
}

function handleCategoryLevel3Change() {
  renderCategoryHint();
  syncIndustryFromCategory();
}

function getCategoryNodeById(nodeId) {
  if (!nodeId) {
    return null;
  }

  return state.categoryIndex.get(nodeId) || null;
}

function getSelectedCategoryNode() {
  return getCategoryNodeById(categoryLevel3Select.value)
    || getCategoryNodeById(categoryLevel2Select.value)
    || getCategoryNodeById(categoryLevel1Select.value)
    || null;
}

function syncIndustryFromCategory() {
  const selectedCategoryNode = getSelectedCategoryNode();
  const canAutoFill = !industrySelect.value || industrySelect.dataset.autoDerived === "true";

  if (!selectedCategoryNode) {
    if (industrySelect.dataset.autoDerived === "true") {
      industrySelect.value = "";
    }
    return;
  }

  if (!canAutoFill || !selectedCategoryNode.suggestedIndustryGroup) {
    return;
  }

  industrySelect.value = selectedCategoryNode.suggestedIndustryGroup;
  industrySelect.dataset.autoDerived = "true";
}

function renderCategoryHint() {
  const selectedCategoryNode = getSelectedCategoryNode();
  if (!selectedCategoryNode) {
    categoryHint.textContent = "\u672a\u6307\u5b9a\u7c7b\u76ee\u65f6\uff0c\u4ecd\u6309\u641c\u7d22\u8bcd\u548c\u884c\u4e1a\u7ec4\u6267\u884c\u3002";
    return;
  }

  const labels = [
    getCategoryNodeById(categoryLevel1Select.value)?.label,
    getCategoryNodeById(categoryLevel2Select.value)?.label,
    getCategoryNodeById(categoryLevel3Select.value)?.localLabel || getCategoryNodeById(categoryLevel3Select.value)?.label
  ].filter(Boolean);
  const industryLabel = industrySelect.options[industrySelect.selectedIndex]?.textContent || "";
  const coarseGroupHint = industryLabel && industrySelect.dataset.autoDerived === "true"
    ? `，已自动归入 ${industryLabel}`
    : "";

  categoryHint.textContent = `已选择：${labels.join(" / ")}${coarseGroupHint}`;
}

function renderCityOptions(countryPreset) {
  cityPicker.open = false;

  if (!countryPreset?.cities?.length) {
    cityPicker.classList.add("disabled");
    citySummary.textContent = countryPreset ? "\u6682\u65e0\u57ce\u5e02\u9009\u9879" : "\u8bf7\u5148\u9009\u62e9\u56fd\u5bb6";
    cityOptions.innerHTML = "";
    return;
  }

  cityPicker.classList.remove("disabled");
  citySummary.textContent = "\u4e0d\u9650\u57ce\u5e02";
  cityOptions.innerHTML = `
    <div class="multi-select-actions">
      <button type="button" class="mini-button" data-city-action="select-all">\u5168\u9009</button>
      <button type="button" class="mini-button" data-city-action="clear">\u6e05\u7a7a</button>
    </div>
    <div class="city-option-grid">
      ${countryPreset.cities.map((city) => {
        return `
          <label class="city-option">
            <input
              type="checkbox"
              name="cities"
              value="${escapeHtml(city.value)}"
              data-city-label="${escapeHtml(city.label)}"
            />
            <span>${escapeHtml(city.label)}</span>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function handleCityAction(event) {
  const actionButton = event.target.closest("[data-city-action]");
  if (!actionButton) {
    return;
  }

  const shouldSelect = actionButton.dataset.cityAction === "select-all";
  cityOptions.querySelectorAll('input[name="cities"]').forEach((checkbox) => {
    checkbox.checked = shouldSelect;
  });
  updateCitySummary();
  renderQueryEstimate();
}

function updateCitySummary() {
  const selectedCities = [...cityOptions.querySelectorAll('input[name="cities"]:checked')];
  if (!selectedCities.length) {
    citySummary.textContent = "\u4e0d\u9650\u57ce\u5e02";
    return;
  }

  const labels = selectedCities.map((input) => input.dataset.cityLabel || input.value);
  const preview = labels.slice(0, 2).join("\u3001");
  const remainder = labels.length > 2 ? ` \u7b49 ${labels.length} \u4e2a` : "";
  citySummary.textContent = `${preview}${remainder}`;
}

function getVisibleJobs() {
  return state.jobs.filter((job) => {
    if (!state.jobDateFilter) {
      return true;
    }

    return toDateInputValue(job.createdAt) === state.jobDateFilter;
  });
}

function getLeadCategoryData(lead) {
  const industry = state.options?.industries?.find((item) => item.id === lead.industryGroup);
  const matchedCategory = lead.rawResult?.matchedCategory || lead.rawResult?.selectedCategory || null;

  return {
    industryGroup: industry?.exportGroupLabel || industry?.label || matchedCategory?.level1Label || lead.industryGroup || "",
    categoryEnglish: Array.isArray(matchedCategory?.pathEnglish) && matchedCategory.pathEnglish.length
      ? matchedCategory.pathEnglish.join(" / ")
      : matchedCategory?.label || industry?.exportCategoryEnglish || industry?.englishLabel || lead.industryGroup || "",
    categoryLocal: matchedCategory?.localLabel
      || matchedCategory?.level3LocalLabel
      || matchedCategory?.displayLabel
      || industry?.exportCategoryLocal
      || industry?.label
      || ""
  };
}

function syncFilterChips() {
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

function renderExternalLink(text, link) {
  if (!link) {
    return `<span class="muted-inline">${UI_TEXT.noLink}</span>`;
  }

  return `<a href="${escapeHtml(link)}" target="_blank" rel="noreferrer">${escapeHtml(text)}</a>`;
}

function renderTableText(value) {
  const content = String(value || "").trim();
  if (!content) {
    return `<span class="muted-inline">-</span>`;
  }

  return `<span class="cell-ellipsis" title="${escapeHtml(content)}">${escapeHtml(content)}</span>`;
}

function humanizeStatus(status) {
  return UI_TEXT.status[status] || UI_TEXT.status.unknown;
}

function getTierLabel(tier) {
  return UI_TEXT.tierLabel[tier] || UI_TEXT.tierLabel.unknown;
}

function statusTone(status) {
  switch (status) {
    case "completed":
      return "ok";
    case "running":
      return "live";
    case "completed_with_warnings":
      return "warn";
    case "failed":
      return "error";
    case "cancelled":
      return "muted";
    default:
      return "idle";
  }
}

function isTerminalStatus(status) {
  return ["completed", "completed_with_warnings", "failed", "cancelled"].includes(status);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || UI_TEXT.requestFailed);
  }

  return data;
}

function renderProviderStatus(element, providerName, provider) {
  const stateLabel = {
    ready: "\u5df2\u9a8c\u8bc1",
    configured: "\u5df2\u914d\u7f6e\uff0c\u5f85\u9996\u6b21\u9a8c\u8bc1",
    error: "\u8fde\u63a5\u5f02\u5e38",
    missing: providerName === "Supabase" ? "\u6f14\u793a\u6a21\u5f0f" : "\u7f3a\u5c11\u5bc6\u94a5"
  };
  const state = provider?.state || (provider?.configured ? "configured" : "missing");
  const label = stateLabel[state] || stateLabel.configured;
  const transportLabel = providerName === "Brave"
    ? {
        proxy: " · 代理",
        "proxy-not-enabled": " · 代理未启用",
        direct: " · 直连"
      }[provider?.transport] || ""
    : "";

  element.innerHTML = `<span class="status-dot"></span>${escapeHtml(providerName)}\uff1a${escapeHtml(label + transportLabel)}`;
  element.classList.toggle("ok", state === "ready");
  element.classList.toggle("warn", state === "missing" || state === "configured");
  element.classList.toggle("error", state === "error");
  element.title = provider?.message || "";
}

function renderQueryEstimate() {
  const rawQueryCount = Number(searchForm.elements.namedItem("maxQueries")?.value || 8);
  const queryCount = Math.max(1, Math.min(24, Number.isFinite(rawQueryCount) ? Math.round(rawQueryCount) : 8));
  const selectedPlatforms = [...searchForm.querySelectorAll('input[name="platforms"]:checked')];
  const selectedCities = [...cityOptions.querySelectorAll('input[name="cities"]:checked')];
  const platformCount = selectedPlatforms.length;
  const delaySeconds = Math.ceil(Math.max(0, queryCount - 1) * 0.9);

  if (!platformCount) {
    queryEstimate.innerHTML = `
      <strong>\u8bf7\u81f3\u5c11\u9009\u62e9\u4e00\u4e2a\u5e73\u53f0</strong>
      <span>\u672a\u9009\u5e73\u53f0\u65f6\u65e0\u6cd5\u751f\u6210\u641c\u7d22\u8ba1\u5212\u3002</span>
    `;
    queryEstimate.classList.add("warn");
    return;
  }

  const allocationHint = platformCount > 1
    ? `\u5c06\u5728 ${platformCount} \u4e2a\u5e73\u53f0\u95f4\u4ea4\u66ff\u5206\u914d`
    : "\u5c06\u5728\u5f53\u524d\u5e73\u53f0\u6267\u884c";
  const cityHint = selectedCities.length
    ? `\uff0c\u8986\u76d6 ${selectedCities.length} \u4e2a\u57ce\u5e02`
    : "\uff0c\u4e0d\u9650\u57ce\u5e02";
  queryEstimate.innerHTML = `
    <strong>\u6700\u591a ${queryCount} \u6b21 Brave \u641c\u7d22\u8bf7\u6c42</strong>
    <span>${allocationHint}${cityHint}\uff0c\u8bf7\u6c42\u95f4\u9694\u81f3\u5c11\u7ea6 ${delaySeconds} \u79d2\u3002</span>
  `;
  queryEstimate.classList.remove("warn");
}

function showFormMessage(message, tone = "error") {
  formMessage.textContent = message;
  formMessage.classList.remove("hidden", "error", "success");
  formMessage.classList.add(tone);
}

function clearFormMessage() {
  formMessage.textContent = "";
  formMessage.classList.add("hidden");
  formMessage.classList.remove("error", "success");
}

function getQualityScore(lead) {
  const storedScore = Number(lead.rawResult?.qualityScore);
  if (Number.isFinite(storedScore)) {
    return Math.max(0, Math.min(100, Math.round(storedScore)));
  }

  if (lead.confidence === "high") {
    return 85;
  }

  if (lead.confidence === "medium") {
    return 60;
  }

  return 35;
}

function renderQualityScore(score, confidence) {
  const normalizedConfidence = ["high", "medium", "low"].includes(confidence)
    ? confidence
    : score >= 75
      ? "high"
      : score >= 50
        ? "medium"
        : "low";

  return `
    <div class="score-cell ${normalizedConfidence}">
      <strong>${score}</strong>
      <span>${escapeHtml(UI_TEXT.scoreLabel[normalizedConfidence])}</span>
    </div>
  `;
}

function renderQualityBreakdown(lead) {
  const score = getQualityScore(lead);
  const factors = Array.isArray(lead.rawResult?.qualityFactors) ? lead.rawResult.qualityFactors : [];
  const factorMarkup = factors.length
    ? factors.map((factor) => {
      const points = Number(factor.points || 0);
      const tone = points >= 0 ? "positive" : "negative";
      const prefix = points > 0 ? "+" : "";
      return `
        <span class="quality-factor ${tone}">
          ${escapeHtml(UI_TEXT.qualityFactorLabel[factor.code] || factor.code)}
          <strong>${prefix}${points}</strong>
        </span>
      `;
    }).join("")
    : `<span class="muted-inline">\u5386\u53f2\u7ebf\u7d22\u6682\u65e0\u8bc4\u5206\u660e\u7ec6\u3002</span>`;

  return `
    <div class="quality-score-large">
      <strong>${score}</strong>
      <span>/ 100</span>
    </div>
    <div class="quality-factors">${factorMarkup}</div>
  `;
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleTimeString("zh-CN", {
    hour12: false
  });
}

function formatDateLabel(value) {
  if (!value) {
    return "";
  }

  return value.replace(/-/g, "/");
}

function toDateInputValue(value) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function truncateText(value, maxLength) {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}...`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
