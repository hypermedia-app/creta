# Getting started

The recommended way to get started with project Creta is by connecting `@hydrofoil/knossos` to a triple store which will contain everything about the API: the Hydra resources, ACLs, user data, etc.

## Installation

```bash
yarn add @hydrofoil/knossos 
yarn add -D @hydrofoil/talos
```

The first step is to install the server CLI and `talos` which is used to initialize a base set of resources in the database.

## Resource preparation

While a running `knossos` application is ideally meant to be managed 100% using a Hydra API itself, the core set of resources is best bootstrapped manually to avoid unnecessary loosening application security settings (Authorizations) to bypass constraint check, and avoid having to create resources in specific order.

To prepare a project run `yarn knossos init`, which will copy the core resources required by the API into the `./resources` directory.

Modify them as necessary and commit. Those are the resource which will be inserted into the database by `talos`.

The directory tree directly translates to resource identifiers so that any path relative to `./resources` will be path of a URL based in the API base itself. The extension removed. Special meaning is given to `index.ttl`, where the entire file name gets removed from the URI, such that `./resources/api/index.ttl` becomes `/api`.

> [!TIP]
> More files can be added in a similar directory structure to build up a project-specific set of resources to be populated in an empty database.

## Initializing an API

With resources ready in the repository, it's time to write them into the store. For that, run the command below.

```bash
yarn talos put --vocabs --resources \
  --api https://example.com \
  --endpoint http://database.app/sparql \
  --user admin
  --password password
```

The `--vocabs --resources` flags instruct `talos` to write into the database the required vocabularies (useful for inferencing) and all the resources created in the previous step.

The rest are SPARQL endpoint details, and the API's base URL.

## Running the application

To simply run, no additional code is strictly required. All it takes is running knossos pointed at the database SPARQL endpoint.

```bash
yarn knossos serve http://database.app/sparql \
  --user minos \
  --password password \
  --name conduit
```

The `--name` flag is informational. Notably, becomes a prefix for all logged messages.

> [!NOTE]
> Running like this does not include any authentication layer, which means it has to be provided on a per-app basis. Read more in the [knossos/Security](knossos/auth.md) page

> [!TIP]
> Note that the command does not require any base URL parameter for the actual API's resources. It will be automatically derived from the request context, such as proxy headers, while the actual express process does not need that information up-front and simply serves HTTP on localhost. More on [knossos/Resource URLs](./knossos/resource-url.md)
