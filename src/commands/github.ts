import { Command } from 'commander';
import { Octokit } from '@octokit/rest';
import ora from 'ora';

export function loadCommands(program: Command) {
    const githubCommand = program
        .command('github')
        .description('Interact with the GitHub API');

    githubCommand
        .command('list-repos')
        .description('List repositories with details')
        .argument('<sort>', 'Sort repositories by created, updated, pushed, or full_name')
        .action(async (sort) => {
            const githubToken = process.env.GITHUB_TOKEN;
            
            if (!githubToken) {
                console.error('Error: GITHUB_TOKEN environment variable is not set.');
                console.error('Please set your GitHub personal access token as GITHUB_TOKEN environment variable.');
                console.error('Example: export GITHUB_TOKEN=your_token_here');
                process.exit(1);
            }
            
            const spinner = ora(`Fetching repositories from GitHub...`).start();
            
            try {
                const octokit = new Octokit({ auth: githubToken });
                
                const { data: repos } = await octokit.repos.listForAuthenticatedUser({
                    sort: sort as 'created' | 'updated' | 'pushed' | 'full_name',
                });
                
                spinner.succeed('Repositories fetched successfully!');
                
                console.log(`\nFound ${repos.length} repository(ies):`);
                console.log('');
                
                repos.forEach((repo) => {
                    console.log(`- ${repo.name}: ${repo.html_url} (${repo.stargazers_count} stars)`);
                });
            } catch (error) {
                spinner.fail('Failed to fetch repositories');
                console.error('Error:', error instanceof Error ? error.message : String(error));
                process.exit(1);
            }
        });
}
