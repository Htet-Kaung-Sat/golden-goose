import * as yup from "yup";
import {
  maxValueMsg,
  minLengthMsg,
  minValueMsg,
  noCapitalLetterMsg,
  notSpaceMsg,
  passwordMatchMsg,
  requiredMsg,
  noSpecialCharacterMsg,
  formatMsg,
  rangeMsg,
  maxLengthMsg,
} from "../messages/ValidationMessages";

export const NewUserSchema = yup.object({
  creator_account: yup.string().trim().required(requiredMsg()),
  account: yup
    .string()
    .trim()
    .required(requiredMsg())
    .matches(/^\S*$/, notSpaceMsg())
    .matches(/^[^A-Z]*$/, noCapitalLetterMsg())
    .matches(/^[a-zA-Z0-9_ ]*$/, noSpecialCharacterMsg())
    .min(4, minLengthMsg(4))
    .max(255, maxLengthMsg(255)),
  name: yup.string().trim().required(requiredMsg()).max(255, maxLengthMsg(255)),
  password: yup
    .string()
    .trim()
    .required(requiredMsg())
    .min(6, minLengthMsg(6))
    .max(255, maxLengthMsg(255)),
  password_confirmation: yup
    .string()
    .trim()
    .required(requiredMsg())
    .min(6, minLengthMsg(6))
    .max(255, maxLengthMsg(255))
    .test(
      "match-password",
      passwordMatchMsg("nu_confirm_password", "nu_password"),
      function (value) {
        if (!value || value.length < 6) return true;
        return value === this.resolve(yup.ref("password"));
      },
    ),
  role_id: yup.string().trim().required(requiredMsg()),
  bonus_type: yup.string().trim().required(),
  bonus_rate: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .min(0, minValueMsg(0))
    .max(0.9, maxValueMsg(0.9))
    .test("format", formatMsg(), (value) => {
      return /^\d+(\.\d{1,2})?$/.test(String(value));
    })
    .required(requiredMsg()),
  share_type: yup.boolean().nullable(),
  share_rate: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .nullable()
    .test("is-within-range", rangeMsg(), function (value) {
      const { role_id, share_type } = this.parent;
      if (role_id !== "agent" || share_type !== true) {
        return true;
      }
      const val = Number(value);
      return !isNaN(val) && val >= 10 && val <= 99;
    }),
});
