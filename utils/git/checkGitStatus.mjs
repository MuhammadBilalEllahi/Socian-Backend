import moment from "moment";
import simpleGit from "simple-git";
import chalk from "chalk";
const git = simpleGit();

async function checkGitStatus() {
  try {
    // Explicitly fetch to ensure you're up-to-date with the remote
    await git.fetch();
    console.log("Fetching latest changes...");

    const status = await git.status(); // Get current branch status
    const currentBranch = status.current;

    // Get the commit log comparing local branch ('rayyan') with remote branch ('main')
    const log = await git.log([`origin/main..${currentBranch}`]);
    // console.log(chalk.red(JSON.stringify(log)));

    // Check if there are any commits ahead or behind
    const behindCount = log.total; // Number of commits behind
    const aheadCount = (await git.log([`${currentBranch}..origin/main`])).total; // Number of commits ahead
    // console.log(
    //   chalk.red(
    //     JSON.stringify(await git.log([`${currentBranch}..origin/main`]))
    //   )
    // );
    const behindMessage = `behind by ${aheadCount} commits`;
    const aheadMessage = `ahead by ${behindCount} commits`;

    if (behindCount > 0 || aheadCount > 0) {
      console.log(
        chalk.yellow(`
Hi this is Bilal,

This is a reminder to fetch and pull the latest changes from the remote branch before you start working.
Your branch ('${currentBranch}') is ${behindMessage}, ${aheadMessage}.

Please run:
  git fetch
  git pull

Thank you!
      `)
      );
      console.log(chalk.bgGray("Always remember to pnpm install"));
    } else {
      console.log(chalk.green("Your branch is up-to-date with the remote."));
    }
  } catch (error) {
    console.error(chalk.red("Error checking Git status:"), error);
    process.exit(1); // Exit with error code if something goes wrong
  }
}

checkGitStatus();
