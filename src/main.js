/* eslint-disable camelcase */
const core = require("@actions/core");
const github = require("@actions/github");

const jirProjectUrl = core.getInput("jira-project-url");
const ticketRegexRaw = core.getInput("ticket-regex-title");
const githubToken = core.getInput("GITHUB_TOKEN");

const octokit = new github.getOctokit(githubToken);

const DEFAULT_TICKET_REGEX = /^[A-Z,a-z]{2,}-\d{1,}:/g;

/**
 * Searches with first Ticket like structure with colon and later removes it.
 *
 * @param {string} title
 */
function grabTicket(title) {
  const ticketRegex = ticketRegexRaw
    ? new RegExp(ticketRegexRaw, "g")
    : DEFAULT_TICKET_REGEX;
  const ticketIdWithColon = title.match(ticketRegex)?.[0];

  if (!ticketIdWithColon) {
    return null;
  }

  return ticketIdWithColon.slice(0, -1);
}

/**
 * Fetches old PR description and appends Ticket link.
 *
 * @param {*} context
 * @returns {string} Updated body string.
 */
function appendLinkInDescription(context) {
  const prevBody = context.payload.pull_request.body || "";
  const ticketNumber = grabTicket(context.payload.pull_request.title);

  if (!ticketNumber || prevBody.includes("Jira link:")) {
    return;
  }

  const updatedBody = `${prevBody} \n\n ----- \nJira link: [${ticketNumber}](${
    jirProjectUrl + "/" + ticketNumber
  })`;

  return updatedBody;
}

/**
 * Main entry function.
 *
 * @returns Void.
 */
async function runMain() {
  try {
    const context = github.context;

    if (context.payload.pull_request === null) {
      core.setFailed("No pull request found.");

      return;
    }

    const pullRequestNumber = context.payload.pull_request.number;

    const updatedBody = await appendLinkInDescription(context);

    if (!updatedBody) {
      return;
    }
    await octokit.rest.pulls.update({
      ...context.repo,
      pull_number: pullRequestNumber,
      body: updatedBody,
    });
  } catch (error) {
    core.setFailed(error.message);
  }
}

runMain();
