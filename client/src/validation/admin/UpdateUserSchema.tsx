import * as yup from "yup";
import {
  noCapitalLetterMsg,
  requiredMsg,
  minLengthMsg,
  passwordEqualMsg,
  passwordMatchMsg,
} from "../messages/ValidationMessages";

export const UpdateUserSchema = yup.object({
  account: yup
    .string()
    .label("iu_account")
    .trim()
    .required(requiredMsg())
    .matches(/^[^A-Z]*$/, noCapitalLetterMsg()),
  name: yup.string().label("iu_name").trim().required(requiredMsg()),
  password: yup
    .string()
    .label("iu_password")
    .trim()
    .required(requiredMsg())
    .min(6, minLengthMsg(6)),
  new_password: yup
    .string()
    .label("iu_new_password")
    .trim()
    .required(requiredMsg())
    .min(6, minLengthMsg(6))
    .test(
      "not-equal-to-password",
      passwordEqualMsg("iu_password", "iu_new_password"),
      function (value) {
        if (!value || value.length < 6) return true;
        return value !== this.resolve(yup.ref("password"));
      },
    ),
  confirm_password: yup
    .string()
    .label("iu_confirm_password")
    .trim()
    .required(requiredMsg())
    .min(6, minLengthMsg(6))
    .test(
      "match-new-password",
      passwordMatchMsg("iu_confirm_password", "iu_new_password"),
      function (value) {
        if (!value || value.length < 6) return true;
        return value === this.resolve(yup.ref("new_password"));
      },
    ),
  state: yup.string().label("saf_state").default(""),
  locking: yup.string().label("iu_locking").default(""),
});
