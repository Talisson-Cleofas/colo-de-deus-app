export type ContributionStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type Contribution = { id:string; memberId:string; memberName:string; email:string; amount:number; date:string; referenceMonth:string; method:string; status:ContributionStatus; receiptUrl:string; notes:string };
export type SomaSettings = {
  campaignName:string; description:string; pixKey:string; pixKeyType:string; beneficiary:string; city:string;
  goal:number; startDate:string; endDate:string; active:boolean; pixBank:string; pixAgency:string;
  pixAccount:string; pixCnpj:string; subscriptionUrl:string; pixQrCodeUrl:string;
};
export type SubscriptionSummary = { status:'ACTIVE'|'INACTIVE'|'PENDING'; plan:string; amount:number|null; nextCharge:string|null; cardLastFour:string|null; manageUrl:string };
export type MercadoPagoWebhookBody = { id?:number|string; type?:string; action?:string; live_mode?:boolean; date_created?:string; data?:{id?:string|number} };
export type CheckoutInput = { memberId?:string; name?:string; email?:string; amount:number; competence?:string; description?:string };
export type CheckoutResult = { preferenceId:string; externalReference:string; checkoutUrl:string; sandboxUrl:string; expiresAt:string; status:'created' };
export type MercadoPagoPaymentRecord = {
  id:string; payment_id:string; member_id:string; member_name:string; payer_email:string; external_reference:string;
  status:string; status_detail:string; amount:number; total_paid_amount:number; fee_amount:number; net_amount:number;
  currency:string; payment_method:string; payment_type:string; description:string; date_created:string; date_approved:string;
  date_last_updated:string; reference_month:string; live_mode:string; webhook_action:string; updated_at:string;
  card_brand:string; card_issuer:string; card_last_four:string; installments:number; installment_amount:number;
  authorization_code:string; transaction_id:string; nsu:string; pix_qr_code:string; pix_qr_code_base64:string;
  pix_ticket_url:string; pix_expiration_date:string; paid_in_seconds:number; receipt_id:string; receipt_hash:string;
};
export type FinancialReport = {
  period:{from:string;to:string}; totals:{gross:number;fees:number;net:number;ticketAverage:number;today:number;week:number;month:number;year:number};
  counters:{approved:number;pending:number;rejected:number;refunded:number;chargedBack:number};
  byMethod:Array<{key:string;label:string;count:number;gross:number;net:number}>;
  byMonth:Array<{month:string;gross:number;fees:number;net:number;count:number}>;
  byMinistry:Array<{id:string;name:string;members:number;payers:number;pending:number;gross:number;percentage:number}>;
  byCell:Array<{id:string;name:string;members:number;payers:number;pending:number;gross:number;percentage:number}>;
  payments:MercadoPagoPaymentRecord[];
};
