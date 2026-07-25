export type MapMarkerData={id:string;title:string;description?:string;address?:string;category:'MEMBER'|'CELL'|'CENACLE'|'EVENT';latitude:number;longitude:number;navigationUrl:string;metadata?:Record<string,string>};
export type IntegrationStatus={enabled:boolean;configured:boolean;message:string;connected?:boolean};
