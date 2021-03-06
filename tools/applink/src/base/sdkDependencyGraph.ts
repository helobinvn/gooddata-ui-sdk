// (C) 2020 GoodData Corporation

import { readJsonSync } from "./utils";
import path from "path";
import groupBy from "lodash/groupBy";
import flatMap from "lodash/flatMap";
import difference from "lodash/difference";
import fromPairs from "lodash/fromPairs";
import { DependencyGraph, DependencyType, SdkPackageDescriptor } from "./types";

function addDependencies(
    graph: DependencyGraph,
    from: string,
    toPackages: Record<string, string> | undefined,
    type: DependencyType,
) {
    if (!toPackages) {
        return;
    }

    for (const to of Object.keys(toPackages)) {
        if (!graph.nodesSet.has(to)) {
            continue;
        }

        graph.edges.push({
            from,
            to,
            type,
        });
    }
}
/**
 * Given SDK packages, this function will construct the package dependency graph. This will be a directed acyclic graph.
 *
 * Note: this function does not check for cycles and relies on our current rush setup that prevents cycles.
 *
 * See {@link DependencyGraph}
 *
 * @param packages - list of packages
 */
export function createDependencyGraph(packages: SdkPackageDescriptor[]): DependencyGraph {
    const graph: DependencyGraph = {
        nodes: [],
        edges: [],
        nodesSet: new Set<string>(),
        outgoing: {},
        incoming: {},
    };

    for (const pkg of packages) {
        graph.nodes.push(pkg.packageName);
        graph.nodesSet.add(pkg.packageName);
    }

    for (const pkg of packages) {
        const packageJson = readJsonSync(path.join(pkg.directory, "package.json"));
        const depedencies: Record<string, string> = packageJson.dependencies;
        const devDependencies: Record<string, string> = packageJson.devDependencies;
        const peerDependencies: Record<string, string> = packageJson.peerDependencies;

        addDependencies(graph, pkg.packageName, depedencies, "prod");
        addDependencies(graph, pkg.packageName, devDependencies, "dev");
        addDependencies(graph, pkg.packageName, peerDependencies, "peer");
    }

    return {
        ...graph,
        outgoing: groupBy(graph.edges, (e) => e.from),
        incoming: groupBy(graph.edges, (e) => e.to),
    };
}

/**
 * Given a list of SDK packages, this function will find all packages that depend on them. The function returns
 * results partitioned by input package. For each package on input, there will be an entry in the resulting array which
 * will contain an array of all dependent packages.
 *
 * @param graph - dependency graph
 * @param packages - packages to get dependencies for
 */
export function findDependingPackages(
    graph: DependencyGraph,
    packages: Array<string | SdkPackageDescriptor>,
): string[][] {
    const names = packages.map((p) => (typeof p === "string" ? p : p.packageName));
    const results: string[][] = [];

    for (const pkg of names) {
        let remaining = [pkg];
        const result: string[] = [];

        while (remaining.length > 0) {
            /*
             * For all remaining packages to investigate, check out which packages are depending on them,
             * add them to result and then prepare for the next cycle
             */
            const depending = flatMap(remaining, (p) => graph.incoming[p]?.map((d) => d.from) ?? []);

            result.push(...depending);
            remaining = depending;
        }

        results.push(result);
    }

    return results;
}

/**
 * Determines the SDK packages build order. The result is the SDK packages grouped so that packages in each group
 * can be safely built in parallel and the next group can only be built if the previous group is built.
 *
 * @param graph - dependency graph to create build order for
 */
export function determinePackageBuildOrder(graph: DependencyGraph): string[][] {
    /*
     * The algorithm to achieve this does 'shave' the packages from the leaves up to the roots. The package
     * can only be shaved-off if all packages which it depends on have already been shaved off.
     */
    const allShavedOffDependencies: Record<string, string[]> = fromPairs(
        graph.nodes.map((node) => [node, []]),
    );
    const groups: string[][] = [];

    // Start with the leaves = those nodes for which there are no outgoing edges
    let walkEntries: string[] = [...difference(graph.nodes, Object.keys(graph.outgoing))];

    while (walkEntries.length > 0) {
        // All entries are possible candidates to form a group of packages that can be built together
        const possibleGroup = walkEntries;
        // Entries collected for next walk as they did not meet criteria to enter a group in this iteration
        const nextWalk = new Set<string>();
        // Dependencies that have been shaved-off during this iteration. These have to be collected and 'commited'
        //  only at the end of the iteration
        const shavedOffByThisGroup: string[][] = [];
        // Current group
        const group = [];

        while (possibleGroup.length > 0) {
            const pkg = possibleGroup.pop()!;
            const packageDependencies = graph.outgoing[pkg]?.map((d) => d.to) ?? [];
            const shavedForThisPackage = allShavedOffDependencies[pkg]!;
            const leftToShaveOff = difference(packageDependencies, shavedForThisPackage);

            if (!leftToShaveOff.length) {
                /*
                 * If all package's deps were already shaved-off, then it can be added to the group. The packages
                 * that depend on this shaved-off package can be considered for the next group.
                 */
                group.push(pkg);

                const dependents = graph.incoming[pkg]?.map((d) => d.from) ?? [];

                for (const dep of dependents) {
                    shavedOffByThisGroup.push([dep, pkg]);
                    nextWalk.add(dep);
                }
            } else {
                /*
                 * Package has still some outstanding dependencies that must be shaved-off. Try again next iteration.
                 */
                nextWalk.add(pkg);
            }
        }

        if (group.length === 0) {
            /*
             * If this happens then there must be cycles in the graph.
             */
            throw new Error();
        }

        groups.push(group);

        shavedOffByThisGroup.forEach(([from, to]) => {
            allShavedOffDependencies[from].push(to);
        });
        walkEntries = Array.from(nextWalk.keys());
    }

    return groups;
}
