export namespace git {
	
	export class ChangedFile {
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
	        this.path = source["path"];
	        this.oldPath = source["oldPath"];
	        this.fileName = source["fileName"];
	        this.status = source["status"];
	        this.staged = source["staged"];
	        this.untracked = source["untracked"];
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

