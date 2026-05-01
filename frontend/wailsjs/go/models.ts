export namespace git {
	
	export class ChangedFile {
	    id: string;
	    path: string;
	    oldPath?: string;
	    fileName: string;
	    status: string;
	    staged: boolean;
	    untracked: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ChangedFile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.path = source["path"];
	        this.oldPath = source["oldPath"];
	        this.fileName = source["fileName"];
	        this.status = source["status"];
	        this.staged = source["staged"];
	        this.untracked = source["untracked"];
	    }
	}
	export class Commit {
	    hash: string;
	    shortHash: string;
	    parentHashes: string[];
	    message: string;
	    authorName: string;
	    authorEmail: string;
	    timestamp: number;
	
	    static createFrom(source: any = {}) {
	        return new Commit(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.hash = source["hash"];
	        this.shortHash = source["shortHash"];
	        this.parentHashes = source["parentHashes"];
	        this.message = source["message"];
	        this.authorName = source["authorName"];
	        this.authorEmail = source["authorEmail"];
	        this.timestamp = source["timestamp"];
	    }
	}
	export class Ref {
	    name: string;
	    hash: string;
	    type: string;
	    isHead: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Ref(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.hash = source["hash"];
	        this.type = source["type"];
	        this.isHead = source["isHead"];
	    }
	}
	export class HistoryResult {
	    commits: Commit[];
	    refs: Ref[];
	
	    static createFrom(source: any = {}) {
	        return new HistoryResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.commits = this.convertValues(source["commits"], Commit);
	        this.refs = this.convertValues(source["refs"], Ref);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class RepoSummary {
	    path: string;
	    branch: string;
	
	    static createFrom(source: any = {}) {
	        return new RepoSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.path = source["path"];
	        this.branch = source["branch"];
	    }
	}

}

