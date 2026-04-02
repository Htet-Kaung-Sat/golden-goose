import React from "react";
import { Icon } from "@iconify/react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AgreementDialogProps {
  open: boolean;
  onClose: () => void;
}

const AgreementDialog: React.FC<AgreementDialogProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        className="
          w-2/3
          h-auto
          rounded-lg
          overflow-hidden
          relative
          border border-yellow-600/30
          bg-green-900
        "
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-yellow-400 hover:scale-110 transition"
        >
          <Icon
            icon="material-symbols:close-rounded"
            className="cursor-pointer md:w-13 md:h-13 w-7 h-7"
          />
        </button>

        <div className="text-center md:text-4xl text-xl text-yellow-400 font-semibold py-6 tracking-widest">
          协议条款
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-40 h-[2px] bg-yellow-500/60" />
          <Icon icon="mdi:flower-outline" className="text-yellow-400" />
          <div className="w-40 h-[2px] bg-yellow-500/60" />
        </div>

        <ScrollArea className="mx-2 md:mx-7 px-3 pb-7 h-[500px]">
          <div className="text-sm md:text-xl leading-relaxed bg-black/50 p-4 text-gray-200 space-y-6">
            <p>
              为避免于本网站下注时之争议, 请会员务必于进入网站前,
              详细阅读本网站所定的各项规则客户一经进入游戏,
              即被视为已接受所有之规定!
            </p>

            <p>
              1. 本公司是缅甸勐拉合法互联网交易机构,
              凡有意参与金宝国际娱乐之客户,
              应注意其国家或居住地区的相关法律法规是否符合博彩条例内之规限,
              如有疑问应就相关问题, 寻求当地法律意见
              (本公司不接受客户因违反法律法规及博彩法例所引起之任何诉讼或刑事责任)。
            </p>

            <p>
              2. 客戶有责任确保自己的账户资料的保密性,
              以会员账号及密码进行的任何网上投注,
              將被视为“有效”。请您于首次使用前更改原始密码。如果客戶发现或怀疑自己的资料被盜用,
              请告知本公司或代理商, 立即变更密码,
              被盗用账号及密码所造成的损失将由客户自行负责。
            </p>

            <p>
              3. 为避免争议, 会员在投注之后, 在 “下注记录”
              内检查下注金额及派彩结果。下注完成点选确定投注后所投注单不得取消。若发现有任何异常之处,
              请立即与代理商联络查证, 否则,
              会员必须同意该项投注为有效之投注交易,
              一切投注历史将以本公司资料库的资料为准, 任何会员不得异议。
            </p>

            <p>
              4. 凡会员下注途中, 意外断线或强制下线, 之前已确认注单依然有效,
              并不影响开牌结果。
            </p>

            <p>
              5. 为确保各方利益, 请各位会员投注后列印资料作为存根,
              本公司不接受没有列印资料的投诉, 客户若不能提供充分的数据,
              其账户内一切数据或历史数据, 以本公司数据库中的数据为准。
            </p>

            <p>6. 若遇发牌时发生人为错误, 现场经理将依国际惯例公平公正处理。</p>

            <p>
              7. 本网站在下注过程中, 若出现任何错误或非故意之人为疏失,
              本网站将保留更改的权利, 并以公布, 不会另行通知各位会员。
            </p>

            <p>
              8. 本公司拥有裁决及注销任何涉嫌以非正常方式投注之权利,
              调查期间将停止发放有关之任何彩金, 恶意透过本网站漏洞,
              或使用外挂程序, 或擅自修改取得之不当账目, 经查证属实者,
              本网站将立即关闭该用户之账户, 及所有账目将不予计算。
            </p>

            <p>9. 本公司只受理会员在三日内提出之投诉, 逾期将不予受理。</p>

            <p>
              10. 用户在进行游戏前应核实其所在地区进行联机游戏是否符合当地法律。
            </p>

            <p>
              11. 本公司之视频为真人直播, 故该局游戏若因网络传输问题出现争议,
              将以现场监控录像看到牌局结果決定输赢。
            </p>

            <p>
              12. 本公司提供之牌路仅供参考,
              若因网络传输问题或其他因素造成牌路显示有误,
              所有游戏结果將以监控录像开牌及游戏记录为主。
            </p>

            <p>
              13. 本网站如被黑客入破坏侵、
              “电脑病毒感染”或不可抗拒之灾害而导致网站故障或资料损坏等问题,
              处理及安排之权利归于本公司。
            </p>

            <p>14. 本网投系统设定会员长时间没有投注, 逾时将被自动注销。</p>

            <p>
              15. 若发现同一会员有重复申请帐号同时投注行为,
              本公司有收回所有优惠及关闭该帐户的权利。
            </p>

            <p>
              16. 在任何情况下本公司之裁定为最终结果, 本公司保留最终解释权。
            </p>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default AgreementDialog;
