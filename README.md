# Setup Chart Releaser
**Set up your GitHub Actions workflow with a specific version of chart-releaser**

Acceptable values are `'latest'` or the semantic version of a tagged release.
Use this action in a workflow to define which version of `cr` will be used:
```yaml
- uses: broadinstitute/setup-chart-releaser@master
  with:
    version: latest # Or a pinned version
```
The cached `cr` binary path (`cr.exe` on Windows hosts) is prepended to the `PATH`
environment variable as well as stored in the `chart-releaser-path` output variable.

## Acknowledgements
The logic in this action is based heavily off of Azure's
[`setup-helm`](https://github.com/Azure/setup-helm) action.
